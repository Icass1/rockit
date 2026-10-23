import asyncio
import time
from dataclasses import asdict
from datetime import timedelta
from typing import Any, Callable

from sqlalchemy.ext.asyncio import AsyncSession

from backend.constants import (
    RECOMMENDATION_EXTERNAL_CACHE_HOURS,
    RECOMMENDATION_EXTERNAL_TIMEOUT_SECONDS,
)
from backend.utils.logger import getLogger

from backend.core.aResult import AResult
from backend.core.access.externalRecommendationCacheAccess import (
    ExternalRecommendationCacheAccess,
)
from backend.core.framework.provider.baseExternalRecommendationProvider import (
    BaseExternalRecommendationProvider,
)
from backend.core.framework.models.recommendation import (
    EExternalStatus,
    ExternalRecommendationContext,
    ExternalRecommendationResult,
    ExternalSuggestion,
)
from backend.core.framework.recommendationRanking import RecommendationRanking

logger = getLogger(__name__)

# How many raw suggestions to ask a provider for, so enough remain after
# deduplication, exclusion and the per-artist cap.
EXTERNAL_CANDIDATE_POOL = 30
# An answer with no suggestions is reused for a shorter time than a full one,
# so a track with no matches can be checked again the same day.
EMPTY_RESULT_CACHE_HOURS = 1.0
# After a provider fails for a given context, skip it (memory only, never
# persisted) for this long: avoids hammering a broken service and repeating
# the same warning on every page load.
FAILURE_BACKOFF_SECONDS = 300.0
FAILURE_BACKOFF_MAX_ENTRIES = 1024
# Hard ceiling for a provider call, including rate-limit waits.
PROVIDER_DEADLINE_FACTOR = 2.0


def _suggestion_from_dict(raw: dict[str, Any]) -> ExternalSuggestion | None:
    artist: Any = raw.get("artist_name")
    track: Any = raw.get("track_name")
    if not isinstance(artist, str) or not isinstance(track, str):
        return None
    score: Any = raw.get("score", 0.0)
    mbid: Any = raw.get("recording_mbid")
    album: Any = raw.get("album_name")
    return ExternalSuggestion(
        artist_name=artist,
        track_name=track,
        score=float(score) if isinstance(score, (int, float)) else 0.0,
        recording_mbid=mbid if isinstance(mbid, str) else None,
        album_name=album if isinstance(album, str) else None,
    )


class ExternalRecommendations:
    """Runs the configured external providers in order with caching, a hard
    deadline and fallback.

    Implementations come from the core provider registry, or can be injected
    for tests. Core only knows the recommendation capability contract.
    Unconfigured providers are skipped. The first provider that yields
    usable suggestions wins. Any failure — timeout, HTTP error, rate limit,
    invalid or empty data — moves on to the next provider; when none
    succeeds the caller simply gets no external suggestions and keeps its
    local ones.
    """

    def __init__(
        self,
        providers: list[BaseExternalRecommendationProvider] | None = None,
        cache_hours: float = RECOMMENDATION_EXTERNAL_CACHE_HOURS,
        timeout_seconds: float = RECOMMENDATION_EXTERNAL_TIMEOUT_SECONDS,
        clock: Callable[[], float] = time.monotonic,
    ):
        self._providers = providers
        self._cache_max_age = timedelta(hours=max(cache_hours, 0.0))
        self._empty_cache_max_age = timedelta(
            hours=min(EMPTY_RESULT_CACHE_HOURS, max(cache_hours, 0.0))
        )
        self._deadline = max(timeout_seconds, 0.1) * PROVIDER_DEADLINE_FACTOR
        self._clock = clock
        self._failed_until: dict[str, float] = {}

    @property
    def providers(self) -> list[BaseExternalRecommendationProvider]:
        """Providers in the order they are tried."""

        if self._providers is not None:
            return list(self._providers)
        from backend.core.framework import providers

        return providers.get_recommendation_providers()

    def configured_provider_names(self) -> list[str]:
        """Display names of the providers this instance can use."""

        return [p.display_name for p in self.providers if p.is_configured()]

    def _in_backoff(self, key: str) -> bool:
        until = self._failed_until.get(key)
        if until is None:
            return False
        if self._clock() >= until:
            del self._failed_until[key]
            return False
        return True

    def _record_failure(self, key: str) -> None:
        if len(self._failed_until) >= FAILURE_BACKOFF_MAX_ENTRIES:
            now = self._clock()
            self._failed_until = {
                k: v for k, v in self._failed_until.items() if v > now
            }
            if len(self._failed_until) >= FAILURE_BACKOFF_MAX_ENTRIES:
                self._failed_until.clear()
        self._failed_until[key] = self._clock() + FAILURE_BACKOFF_SECONDS

    async def _fetch_async(
        self,
        session: AsyncSession,
        provider: BaseExternalRecommendationProvider,
        context: ExternalRecommendationContext,
    ) -> list[ExternalSuggestion] | None:
        """Cached-or-fresh suggestions from one provider; None on failure."""

        cache_key = provider.cache_key(context)

        a_cached = await ExternalRecommendationCacheAccess.get_cached_async(
            session=session, cache_key=cache_key
        )
        if a_cached.is_ok():
            raw_suggestions, age = a_cached.result()
            cached = [
                s
                for s in (_suggestion_from_dict(raw) for raw in raw_suggestions)
                if s is not None
            ]
            # Empty answers expire sooner (see EMPTY_RESULT_CACHE_HOURS).
            max_age = self._cache_max_age if cached else self._empty_cache_max_age
            if age <= max_age:
                return cached

        if self._in_backoff(cache_key):
            return None

        try:
            a_fresh: AResult[list[ExternalSuggestion]] = await asyncio.wait_for(
                provider.get_suggestions_async(
                    context=context, limit=EXTERNAL_CANDIDATE_POOL
                ),
                timeout=self._deadline,
            )
        except asyncio.TimeoutError:
            logger.warning(
                f"{provider.display_name} recommendations exceeded "
                f"{self._deadline:.1f}s, using local recommendations only"
            )
            self._record_failure(cache_key)
            return None
        except Exception as e:
            logger.error(f"{provider.display_name} provider raised: {e}", exc_info=True)
            self._record_failure(cache_key)
            return None

        if a_fresh.is_not_ok():
            logger.warning(
                f"{provider.display_name} recommendations unavailable: "
                f"{a_fresh.message()}"
            )
            self._record_failure(cache_key)
            return None

        suggestions = a_fresh.result()
        a_saved = await ExternalRecommendationCacheAccess.set_cached_async(
            session=session,
            cache_key=cache_key,
            suggestions=[asdict(s) for s in suggestions],
        )
        if a_saved.is_not_ok():
            logger.warning(
                f"Could not cache {provider.display_name} suggestions. "
                f"{a_saved.info()}"
            )
        return suggestions

    async def get_suggestions_async(
        self,
        session: AsyncSession,
        context: ExternalRecommendationContext,
        limit: int,
        exclude_keys: set[tuple[str, str]] | None = None,
    ) -> ExternalRecommendationResult:
        """Suggestions from the first provider with a usable answer. Never
        raises; see EExternalStatus for what the status means."""

        eligible = [
            p for p in self.providers if p.is_configured() and p.can_serve(context)
        ]
        if not eligible or limit <= 0:
            return ExternalRecommendationResult(status=EExternalStatus.DISABLED)

        any_answered = False
        for provider in eligible:
            suggestions = await self._fetch_async(
                session=session, provider=provider, context=context
            )
            if suggestions is None:
                continue

            any_answered = True
            ranked = RecommendationRanking.rank_external_suggestions(
                suggestions=suggestions, limit=limit, exclude_keys=exclude_keys
            )
            if ranked:
                return ExternalRecommendationResult(
                    status=EExternalStatus.OK,
                    provider_name=provider.display_name,
                    suggestions=ranked,
                )

        return ExternalRecommendationResult(
            status=(
                EExternalStatus.EMPTY if any_answered else EExternalStatus.UNAVAILABLE
            )
        )


external_recommendations = ExternalRecommendations()
