import asyncio
import time
import unicodedata
from typing import Any
from urllib.parse import urlsplit

import httpx

from constants import RECOMMENDATION_EXTERNAL_TIMEOUT_SECONDS
from core.framework.externalRecommendation.httpRequest import (
    as_json_list,
    as_json_object,
    send_rate_limited_request_async,
)
from core.framework.externalRecommendation.rateLimiter import RateLimiter
from core.framework.models.recommendation import (
    ExternalRecommendationContext,
    ExternalSuggestion,
)
from core.framework.provider.baseExternalRecommendationProvider import (
    BaseExternalRecommendationProvider,
)
from core.framework.recommendationRanking import RecommendationRanking
from lastfm.constants import LASTFM_API_KEY
from logger import getLogger
from result import Result, ResultCode

logger = getLogger(__name__)

LASTFM_API_URL = "https://ws.audioscrobbler.com/2.0/"
# Last.fm allows a few requests per second per key; stay well below it.
LASTFM_MIN_REQUEST_INTERVAL_SECONDS = 0.25
LASTFM_MAX_RATE_LIMIT_WAIT_SECONDS = 2.5
LASTFM_USER_AGENT = "RockIt/0.0.1 ( https://github.com/Icass1/rockit )"

# Last.fm error codes (returned in the JSON body, sometimes with HTTP 200).
LASTFM_ERROR_NOT_FOUND = 6
LASTFM_ERROR_RATE_LIMIT = 29


class LastfmProvider(BaseExternalRecommendationProvider):
    """Seed-based "similar tracks" from Last.fm's track.getsimilar.

    Requires LASTFM_API_KEY. Sends the seed track's artist and title — one
    track the user chose to play — to Last.fm; nothing else.
    """

    key = "lastfm"
    display_name = "Last.fm"

    def __init__(
        self,
        api_key: str = LASTFM_API_KEY,
        timeout_seconds: float = RECOMMENDATION_EXTERNAL_TIMEOUT_SECONDS,
        limiter: RateLimiter | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._api_key = api_key
        self._timeout = timeout_seconds
        self._limiter = limiter or RateLimiter(
            min_interval_seconds=LASTFM_MIN_REQUEST_INTERVAL_SECONDS,
            max_wait_seconds=LASTFM_MAX_RATE_LIMIT_WAIT_SECONDS,
        )
        # Only set by tests, to mock HTTP.
        self._transport = transport
        self._artwork_cache: dict[tuple[str, str], tuple[float, Result[str | None]]] = {}
        self._artwork_tasks: dict[tuple[str, str], asyncio.Task[Result[str | None]]] = {}
        self._artwork_slots = asyncio.Semaphore(2)

    def is_configured(self) -> bool:
        return bool(self._api_key)

    def can_serve(self, context: ExternalRecommendationContext) -> bool:
        return (
            context.seed is not None
            and bool(context.seed.artist_name.strip())
            and bool(context.seed.track_name.strip())
        )

    def cache_key(self, context: ExternalRecommendationContext) -> str:
        seed = context.seed
        artist, track = (
            RecommendationRanking.suggestion_key(seed.artist_name, seed.track_name)
            if seed
            else ("", "")
        )
        return f"{self.key}|seed|{artist}|{track}"

    async def get_suggestions_async(
        self, context: ExternalRecommendationContext, limit: int
    ) -> Result[list[ExternalSuggestion]]:
        """Tracks Last.fm considers similar to the context's seed."""

        seed = context.seed
        if seed is None:
            return Result(code=ResultCode.BAD_REQUEST, message="No seed track")

        try:
            async with httpx.AsyncClient(
                timeout=self._timeout,
                transport=self._transport,
                headers={"User-Agent": LASTFM_USER_AGENT},
            ) as client:
                a_response = await send_rate_limited_request_async(
                    client=client,
                    limiter=self._limiter,
                    provider_name=self.display_name,
                    method="GET",
                    url=LASTFM_API_URL,
                    params={
                        "method": "track.getsimilar",
                        "artist": seed.artist_name,
                        "track": seed.track_name,
                        "api_key": self._api_key,
                        "format": "json",
                        "limit": limit,
                        "autocorrect": 1,
                    },
                )
        except Exception as e:
            logger.error(f"Unexpected Last.fm error: {e}", exc_info=True)
            return Result(code=ResultCode.GENERAL_ERROR, message="Unexpected Last.fm error")

        if a_response.is_not_ok():
            return Result(code=a_response.code(), message=a_response.message())

        response = a_response.result()
        try:
            data = as_json_object(response.json())
        except ValueError:
            data = None

        if data is not None and "error" in data:
            error_code: Any = data.get("error")
            if error_code == LASTFM_ERROR_NOT_FOUND:
                # Unknown track: a valid "nothing similar" answer.
                return Result(code=ResultCode.OK, message="OK", result=[])
            if error_code == LASTFM_ERROR_RATE_LIMIT:
                self._limiter.update_from_response(status_code=429, headers={})
                return Result(
                    code=ResultCode.RATE_LIMITED,
                    message="Last.fm rate limit exceeded",
                )
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Last.fm returned error {error_code}",
            )

        if response.status_code != 200 or data is None:
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Last.fm returned HTTP {response.status_code}",
            )

        similar = as_json_object(data.get("similartracks"))
        raw_tracks = as_json_list(similar.get("track")) if similar else None
        if raw_tracks is None:
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message="Last.fm returned an invalid similar-tracks payload",
            )

        suggestions: list[ExternalSuggestion] = []
        for raw in raw_tracks:
            suggestion = LastfmProvider._parse_track(raw)
            if suggestion is not None:
                suggestions.append(suggestion)

        return Result(code=ResultCode.OK, message="OK", result=suggestions)

    @staticmethod
    def _artwork_identity(value: str) -> str:
        # Retain version words (live/remix/etc.) while tolerating Unicode punctuation.
        normalized = unicodedata.normalize("NFKD", value).casefold()
        return " ".join(
            "".join(
                c if c.isalnum() else " " for c in normalized if not unicodedata.combining(c)
            ).split()
        )

    async def get_artwork_async(self, artist_name: str, track_name: str) -> Result[str | None]:
        """Lazy track.getInfo album artwork, cached and shared across callers."""
        key = (self._artwork_identity(artist_name), self._artwork_identity(track_name))
        if not all(key) or not self.is_configured():
            return Result(code=ResultCode.OK, message="No artwork", result=None)
        cached = self._artwork_cache.get(key)
        if cached and cached[0] > time.monotonic():
            return cached[1]
        task = self._artwork_tasks.get(key)
        if task is None:
            if len(self._artwork_tasks) >= 16:
                logger.warning("Last.fm artwork queue is full")
                return Result(code=ResultCode.RATE_LIMITED, message="Artwork queue full")
            task = asyncio.create_task(
                self._cached_artwork_async(key=key, artist_name=artist_name, track_name=track_name)
            )
            self._artwork_tasks[key] = task
        return await asyncio.shield(task)

    async def _cached_artwork_async(
        self, key: tuple[str, str], artist_name: str, track_name: str
    ) -> Result[str | None]:
        result: Result[str | None]
        try:
            # Includes queue time; slow images never hold discovery or playback.
            async with asyncio.timeout(8.0):
                async with self._artwork_slots:
                    result = await self._lookup_artwork_async(
                        key=key, artist_name=artist_name, track_name=track_name
                    )
        except Exception as error:
            logger.warning(f"Last.fm artwork lookup failed: {type(error).__name__}")
            result = Result(code=ResultCode.GENERAL_ERROR, message="Artwork unavailable")
        finally:
            self._artwork_tasks.pop(key, None)
        if len(self._artwork_cache) >= 2048:
            self._artwork_cache.pop(next(iter(self._artwork_cache)))
        ttl = 30.0
        if result.is_ok():
            ttl = 86400.0 if result.result() else 3600.0
        self._artwork_cache[key] = (time.monotonic() + ttl, result)
        return result

    async def _lookup_artwork_async(
        self, key: tuple[str, str], artist_name: str, track_name: str
    ) -> Result[str | None]:
        async with httpx.AsyncClient(
            timeout=min(self._timeout, 3.0),
            transport=self._transport,
            headers={"User-Agent": LASTFM_USER_AGENT},
        ) as client:
            response = await send_rate_limited_request_async(
                client=client,
                limiter=self._limiter,
                provider_name=self.display_name,
                method="GET",
                url=LASTFM_API_URL,
                params={
                    "method": "track.getInfo",
                    "artist": artist_name,
                    "track": track_name,
                    "api_key": self._api_key,
                    "format": "json",
                    "autocorrect": 1,
                },
            )
        if response.is_not_ok():
            logger.warning(f"Last.fm artwork request unavailable. {response.info()}")
            return Result(code=response.code(), message=response.message())
        raw_response = response.result()
        if raw_response.status_code != 200:
            logger.warning(f"Last.fm artwork returned HTTP {raw_response.status_code}")
            return Result(code=ResultCode.GENERAL_ERROR, message="Artwork request failed")
        try:
            data = as_json_object(raw_response.json()) or {}
        except ValueError:
            logger.warning("Last.fm artwork returned invalid JSON")
            return Result(code=ResultCode.GENERAL_ERROR, message="Invalid artwork response")
        if data.get("error") == LASTFM_ERROR_NOT_FOUND:
            return Result(code=ResultCode.OK, message="Track not found", result=None)
        if "error" in data:
            if data.get("error") == LASTFM_ERROR_RATE_LIMIT:
                self._limiter.update_from_response(status_code=429, headers={})
            logger.warning("Last.fm artwork returned an API error")
            return Result(code=ResultCode.GENERAL_ERROR, message="Artwork API failed")
        track = as_json_object(data.get("track")) or {}
        artist = as_json_object(track.get("artist")) or {}
        if (
            self._artwork_identity(str(artist.get("name", ""))),
            self._artwork_identity(str(track.get("name", ""))),
        ) != key:
            return Result(code=ResultCode.OK, message="Artwork track mismatch", result=None)
        album = as_json_object(track.get("album")) or {}
        return Result(code=ResultCode.OK, message="OK", result=self._image_url(album.get("image")))

    @staticmethod
    def _parse_track(value: object) -> ExternalSuggestion | None:
        """One similar-track entry -> suggestion, or None without a usable
        title or artist."""

        raw = as_json_object(value)
        if raw is None:
            return None
        name: Any = raw.get("name")
        artist = as_json_object(raw.get("artist"))
        artist_name: Any = artist.get("name") if artist else None
        if not isinstance(name, str) or not name.strip():
            return None
        if not isinstance(artist_name, str) or not artist_name.strip():
            return None

        raw_match: Any = raw.get("match", 0.0)
        try:
            match = float(str(raw_match))
        except ValueError:
            match = 0.0

        raw_mbid: Any = raw.get("mbid")
        return ExternalSuggestion(
            artist_name=artist_name.strip(),
            track_name=name.strip(),
            score=match,
            image_url=LastfmProvider._image_url(raw.get("image")),
            recording_mbid=raw_mbid if isinstance(raw_mbid, str) and raw_mbid else None,
        )

    @staticmethod
    def _image_url(value: object) -> str | None:
        """Validate Last.fm CDN artwork; reject its generic placeholder."""

        images = as_json_list(value) or []
        for value in reversed(images):
            image = as_json_object(value)
            url = image.get("#text") if image else None
            if not isinstance(url, str) or not url.strip():
                continue
            url = url.strip()
            try:
                parsed = urlsplit(url)
            except ValueError:
                continue
            if (
                parsed.scheme == "https"
                and parsed.netloc in {"lastfm.freetls.fastly.net", "lastfm-img2.akamaized.net"}
                and parsed.path.startswith("/i/u/")
                and "2a96cbd8b46e442fc41c2b86b821562f" not in parsed.path
            ):
                return url
        return None


# The ordinary core registry discovers this module by its provider directory.
provider = LastfmProvider()
name = LastfmProvider.display_name
