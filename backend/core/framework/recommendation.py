import asyncio
from typing import Any, Callable, Awaitable, cast

from cachetools import TTLCache
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.access.recommendationAccess import RecommendationAccess
from backend.core.framework import providers
from backend.core.framework.listenbrainzRecommendation import (
    ExternalRecommendationProvider,
    ListenBrainzRecommendation,
)
from backend.core.framework.localRecommendation import LocalRecommendation, normalize
from backend.core.framework.models.recommendation import RecommendationCandidate
from backend.core.framework.media.media import Media
from backend.core.enums.mediaTypeEnum import MediaTypeEnum
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.recommendationsResponse import RecommendationsResponse
from backend.utils.logger import getLogger

logger = getLogger(__name__)


class Recommendation:
    # Small, per-user metadata snapshots; no render-time library scans.
    candidates: TTLCache[int, list[RecommendationCandidate]] = TTLCache[
        int, list[RecommendationCandidate]
    ](maxsize=64, ttl=60)
    shown: TTLCache[int, list[str]] = TTLCache[int, list[str]](maxsize=512, ttl=600)
    external: ExternalRecommendationProvider = ListenBrainzRecommendation()

    @staticmethod
    async def _songs_async(
        session: AsyncSession, public_ids: list[str]
    ) -> list[BaseSongWithAlbumResponse]:
        """Use existing batch models/conversions, explicitly bypassing Spotify fetch-on-miss."""
        if not public_ids:
            return []
        mapping = await Media.get_medias_from_public_ids_async(
            session=session, public_ids=public_ids, media_type_keys=[MediaTypeEnum.SONG]
        )
        if mapping.is_not_ok():
            logger.error("Recommendation song mapping unavailable")
            return []
        groups: dict[int, list[str]] = {}
        for media in mapping.result():
            groups.setdefault(media.provider_id, []).append(media.public_id)
        songs: dict[str, BaseSongWithAlbumResponse] = {}
        for provider_id, ids in groups.items():
            provider = providers.find_media_provider(provider_id=provider_id)
            if provider is None:
                continue
            module = type(provider).__module__
            result: Any
            if module in {
                "backend.spotify.framework.provider.spotifyProvider",
                "backend.spotifyScrapper.framework.provider.spotifyScrapperProvider",
            }:
                # These providers' normal get_songs methods fetch missing rows online.
                if module.startswith("backend.spotify."):
                    from backend.spotify.access.spotifyAccess import (
                        SpotifyAccess as Access,
                    )
                    from backend.spotify.utils.conversions import (
                        get_tracks_responses_async as convert,
                    )
                else:
                    from backend.spotifyScrapper.access.spotifyScrapperAccess import (
                        SpotifyScrapperAccess as Access,
                    )
                    from backend.spotifyScrapper.utils.conversions import (
                        get_tracks_responses_async as convert,
                    )
                mapping = await Access.get_tracks_spotify_id_from_public_ids_async(
                    session=session, public_ids=ids
                )
                if mapping.is_not_ok():
                    logger.error("Stored recommendation identifiers unavailable")
                    continue
                fetch: Callable[..., Awaitable[Any]] = (
                    Access.get_tracks_by_spotify_ids_async
                )
                tracks = await fetch(
                    session=session, spotify_ids=list(mapping.result().values())
                )
                if tracks.is_not_ok():
                    logger.error("Stored recommendation tracks unavailable")
                    continue
                converter = cast(Callable[..., Awaitable[Any]], convert)
                result = await converter(
                    session=session,
                    provider_name=provider.get_name(),
                    track_rows=tracks.result(),
                )
            elif module in {
                "backend.rockit.framework.provider.rockitProvider",
                "backend.youtubeMusic.framework.provider.youtubeMusicProvider",
            }:
                result = await provider.get_songs_async(session=session, public_ids=ids)
            else:
                continue
            if result.is_not_ok():
                logger.error("Stored recommendation songs unavailable")
                continue
            for song in result.result():
                if song.downloaded and song.audioUrl:
                    songs[song.publicId] = song
        return [songs[pid] for pid in public_ids if pid in songs]

    @staticmethod
    async def get_async(
        session: AsyncSession,
        user_id: int,
        limit: int = 20,
        external_username: str = "",
        current_public_id: str | None = None,
    ) -> AResult[RecommendationsResponse]:
        """Local results always survive external failures, empty data and no matches."""
        candidates = Recommendation.candidates.get(user_id)
        if candidates is None:
            result = await RecommendationAccess.candidates_async(
                session=session, user_id=user_id
            )
            if result.is_not_ok():
                logger.error("Recommendation library metadata unavailable")
                return AResult(
                    code=result.code(),
                    message="Recommendations temporarily unavailable",
                )
            candidates = result.result()
            Recommendation.candidates[user_id] = candidates
        current = await RecommendationAccess.current_async(
            session=session, user_id=user_id
        )
        excluded: set[str] = {current_public_id} if current_public_id else set()
        if current.is_ok() and current.result():
            excluded.add(current.result())
        elif current.is_not_ok():
            logger.error("Current recommendation track lookup unavailable")
        # Recent impressions are a soft exclusion; never empty a small library for them.
        local_ids = LocalRecommendation.rank(
            candidates=candidates, limit=50, excluded=excluded
        )
        previous = set(Recommendation.shown.get(user_id, []))
        fresh = [pid for pid in local_ids if pid not in previous]
        local_ids = fresh + [pid for pid in local_ids if pid in previous]
        local_songs = await Recommendation._songs_async(
            session=session, public_ids=local_ids
        )
        provider_name = "local"
        status = "off"
        external: list[tuple[str, str]] = []
        if external_username.strip() and local_songs:
            status = "unavailable"
            if (
                isinstance(Recommendation.external, ListenBrainzRecommendation)
                and not Recommendation.external.enabled
            ):
                status = "disabled"
            else:
                try:
                    external = await asyncio.wait_for(
                        Recommendation.external.recommendations_async(
                            username=external_username.strip()
                        ),
                        timeout=5.0,
                    )
                except Exception:
                    logger.warning(
                        "External recommendations unavailable; serving local results"
                    )
            if external:
                keys = {
                    (normalize(name), normalize(artist)) for name, artist in external
                }
                external_ids = LocalRecommendation.rank(
                    candidates=candidates,
                    limit=50,
                    excluded=excluded,
                    external=external,
                )
                eligible = set(external_ids)
                usable = any(
                    c.public_id in eligible
                    and (normalize(c.name), normalize(a)) in keys
                    for c in candidates
                    for a in c.artists
                )
                status = "active" if usable else "no_matches"
                if usable:
                    # Hydrate a bounded set using the same existing song model.
                    enhanced = await Recommendation._songs_async(
                        session=session, public_ids=external_ids
                    )
                    if enhanced:
                        local_songs = enhanced
                        provider_name = "listenbrainz"
                    else:
                        status = "unavailable"
        selected = local_songs[: max(1, min(limit, 50))]
        Recommendation.shown[user_id] = [s.publicId for s in selected]
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=RecommendationsResponse(
                songs=selected, provider=provider_name, externalStatus=status
            ),
        )
