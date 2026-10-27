import time
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from constants import RECOMMENDATION_PREFETCH_MAX_PENDING
from core.access.recommendationPrefetchAccess import (
    AUTOPLAY_DOWNLOAD_TITLE,
    RecommendationPrefetchAccess,
)
from core.aResult import AResult, AResultCode
from core.framework.downloader.downloader import Downloader
from core.framework.media.media import Media
from core.framework.models.recommendation import ExternalSuggestion, SeedTrack
from core.framework.recommendation import Recommendation
from core.framework.recommendationRanking import RecommendationRanking
from core.responses.searchResponse import BaseSearchResultsItem
from core.responses.songListResponse import SongListResponse
from logger import getLogger

logger = getLogger(__name__)


class RecommendationPrefetch:
    """A playback-only, two-track window using the ordinary provider/downloader
    path. A database admission lock and budget are shared across all users.
    Reading recommendations never starts downloads.
    """

    _failed_until: dict[tuple[str, str], float] = {}

    @staticmethod
    async def admit_async(session: AsyncSession, public_id: str | None = None) -> AResult[bool]:
        """Admission policy shared by every playback owner and worker."""
        state = await RecommendationPrefetchAccess.get_state_async(
            session=session,
            public_id=public_id,
            failed_since=datetime.now(UTC) - timedelta(minutes=10),
        )
        if state.is_not_ok():
            logger.error(f"Could not read prefetch admission state. {state.info()}")
            return AResult(code=state.code(), message=state.message())
        value = state.result()
        allowed = (
            value.locked
            and value.pending_count < RECOMMENDATION_PREFETCH_MAX_PENDING
            and not value.media_pending
        )
        return AResult(code=AResultCode.OK, message="OK", result=allowed)

    @staticmethod
    async def prepare_async(
        session: AsyncSession,
        user_id: int,
        public_ids: list[str],
        discover: list[SeedTrack],
    ) -> AResult[SongListResponse]:
        public_ids = list(dict.fromkeys(public_ids))[:2]
        songs = await Media.resolve_songs_from_public_ids_async(
            session=session, public_ids=public_ids
        )
        for song in songs:
            if song.downloaded:
                continue
            admitted = await RecommendationPrefetch.admit_async(
                session=session, public_id=song.publicId
            )
            if admitted.is_not_ok():
                logger.error(f"Could not admit recommendation download. {admitted.info()}")
                break
            if not admitted.result():
                continue
            started = await Downloader.download_multiple_medias_async(
                session=session,
                user_id=user_id,
                title=AUTOPLAY_DOWNLOAD_TITLE,
                public_ids=[song.publicId],
            )
            if started.is_not_ok():
                logger.error(f"Could not prepare recommendation. {started.info()}")
                break

        discoveries: list[BaseSearchResultsItem] = []
        if discover:
            for suggestion in discover[: max(0, 2 - len(public_ids))]:
                key = RecommendationRanking.suggestion_key(
                    suggestion.artist_name, suggestion.track_name
                )
                if RecommendationPrefetch._failed_until.get(key, 0) > time.monotonic():
                    continue
                admitted = await RecommendationPrefetch.admit_async(session=session)
                if admitted.is_not_ok():
                    logger.error(f"Could not admit discovery download. {admitted.info()}")
                    break
                if not admitted.result():
                    break
                # Resolve through the registered media providers once, then
                # check the shared media ID before creating any download.
                found = await Downloader.resolve_search_song_async(
                    session=session,
                    artist_name=suggestion.artist_name,
                    track_name=suggestion.track_name,
                )
                if found.is_not_ok():
                    logger.error(f"Discovery search unavailable. {found.info()}")
                    if len(RecommendationPrefetch._failed_until) >= 512:
                        RecommendationPrefetch._failed_until.clear()
                    RecommendationPrefetch._failed_until[key] = time.monotonic() + 300
                    continue
                added = await Downloader.add_search_song_async(
                    session=session, match=found.result()
                )
                if added.is_not_ok():
                    logger.error(f"Could not resolve discovery media. {added.info()}")
                    continue
                public_id = added.result()
                resolved = await Media.resolve_songs_from_public_ids_async(
                    session=session, public_ids=[public_id]
                )
                discovery = Recommendation.build_discover_item(
                    suggestion=ExternalSuggestion(
                        artist_name=suggestion.artist_name,
                        track_name=suggestion.track_name,
                    ),
                    provider_name=found.result().provider,
                    public_id=public_id,
                )
                discovery.downloaded = bool(resolved and resolved[0].downloaded)
                discoveries.append(discovery)
                songs.extend(
                    s for s in resolved if s.publicId not in {song.publicId for song in songs}
                )
                if not resolved or resolved[0].downloaded:
                    continue
                admitted = await RecommendationPrefetch.admit_async(
                    session=session, public_id=public_id
                )
                if admitted.is_not_ok():
                    logger.error(f"Could not admit resolved suggestion. {admitted.info()}")
                    break
                if admitted.result():
                    started = await Downloader.download_multiple_medias_async(
                        session=session,
                        user_id=user_id,
                        title=AUTOPLAY_DOWNLOAD_TITLE,
                        public_ids=[public_id],
                    )
                    if started.is_not_ok():
                        logger.error(f"Could not download discovery suggestion. {started.info()}")
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=SongListResponse(songs=songs, discover=discoveries),
        )
