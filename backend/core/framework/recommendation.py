import asyncio
import time
from typing import NamedTuple

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode
from backend.core.access.recommendationAccess import (
    LOCAL_CANDIDATE_LIMIT,
    RecommendationAccess,
)
from backend.core.access.statsAccess import StatsAccess
from backend.core.access.userLikedMediaAccess import UserLikedMediaAccess
from backend.core.access.userRecommendationSettingsAccess import (
    UserRecommendationSettingsAccess,
)
from backend.core.enums.mediaTypeEnum import MediaTypeEnum
from backend.core.framework.externalRecommendation.externalRecommendations import (
    ExternalRecommendations,
    external_recommendations,
)
from backend.core.framework.media.media import Media
from backend.core.framework.models.media import MediaModel
from backend.core.framework.models.recommendation import (
    EExternalStatus,
    ERecommendationContextKind,
    ExternalRecommendationContext,
    ExternalSuggestion,
    LocalCandidate,
    SeedTrack,
)
from backend.core.framework.recommendationRanking import RecommendationRanking
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseVideoResponse import BaseVideoResponse
from backend.core.responses.searchResponse import (
    ArtistSearchResultsItem,
    BaseSearchResultsItem,
)
from backend.core.responses.songListResponse import SongListResponse

logger = getLogger(__name__)

DEFAULT_RECOMMENDATION_LIMIT = 20
MAX_RECOMMENDATION_LIMIT = 50
# How many of the user's own top/liked songs to seed a personalized feed with.
PROFILE_SEED_LIMIT = 25
# How far back into a user's own listen history to look when excluding
# already-known songs from their personalized feed.
PROFILE_EXCLUDE_LIMIT = 10000
# How many external (not-yet-downloaded) suggestions to show per request.
DISCOVER_LIMIT = 8
# How many recommended songs that are already known to this instance (same
# library, just missing their audio file) to fetch to the server automatically
# per request. Each one costs a yt-dlp download, so this stays small. External
# suggestions are never auto-downloaded — resolving one costs a provider
# search, so it only happens on the user's tap. Set to 0 to disable.
AUTO_DOWNLOAD_LIMIT = 3
# Ranked local results are reused for this long, so re-rendering the home
# page or reopening the player does not re-run the candidate query.
LOCAL_RESULT_CACHE_SECONDS = 60.0
LOCAL_RESULT_CACHE_MAX_ENTRIES = 512

# Strong references to in-flight auto-download tasks. asyncio only keeps weak
# references, so without this a task can be garbage collected mid-download.
_BACKGROUND_TASKS: set["asyncio.Task[None]"] = set()


class _LocalResultCache:
    """Tiny in-process TTL cache for ranked public_id lists. Bounded; the
    oldest entries are dropped first."""

    def __init__(self, ttl_seconds: float, max_entries: int):
        self._ttl = ttl_seconds
        self._max_entries = max_entries
        self._entries: dict[tuple[str, int, str, int], tuple[float, list[str]]] = {}

    def get(self, key: tuple[str, int, str, int]) -> list[str] | None:
        entry = self._entries.get(key)
        if entry is None:
            return None
        stored_at, value = entry
        if time.monotonic() - stored_at > self._ttl:
            del self._entries[key]
            return None
        return list(value)

    def set(self, key: tuple[str, int, str, int], value: list[str]) -> None:
        if key not in self._entries and len(self._entries) >= self._max_entries:
            del self._entries[next(iter(self._entries))]
        self._entries[key] = (time.monotonic(), list(value))

    def clear(self) -> None:
        self._entries.clear()


_local_result_cache = _LocalResultCache(
    ttl_seconds=LOCAL_RESULT_CACHE_SECONDS,
    max_entries=LOCAL_RESULT_CACHE_MAX_ENTRIES,
)


class RecommendationResult(NamedTuple):
    # Local recommendations (always available, computed offline).
    songs: list[BaseSongWithAlbumResponse]
    # External suggestions; tap one through /downloader/start-from-search.
    discover: list[BaseSearchResultsItem]
    discover_provider: str | None = None
    discover_status: EExternalStatus = EExternalStatus.DISABLED


class Recommendation:
    """Recommendations = local engine (always) + optional external discovery.

    The local engine ranks songs already known to this instance from
    Rockit's own data (see RecommendationRanking) and never touches the
    network. External suggestions are opt-in per user and purely additive:
    any provider failure leaves the local songs untouched.
    """

    # Overridable in tests.
    external: ExternalRecommendations = external_recommendations

    @staticmethod
    def to_song_list_response(result: RecommendationResult) -> SongListResponse:
        """Map a recommendation result to the public response model."""

        return SongListResponse(
            songs=result.songs,
            discover=result.discover,
            discoverProvider=result.discover_provider,
            discoverStatus=result.discover_status.value,
        )

    @staticmethod
    def clamp_limit(limit: int) -> int:
        """Keep client-supplied limits within a sane, bounded range."""

        return max(1, min(limit, MAX_RECOMMENDATION_LIMIT))

    @staticmethod
    async def _auto_download_async(
        user_id: int,
        media_public_ids: list[str],
    ) -> None:
        """Queue server-side downloads for recommended songs that have no
        audio file yet.

        Runs detached from the request, on its own session, because the
        request's session is closed as soon as the response is sent.
        Re-queueing is safe: the downloader skips media already downloaded or
        in progress.
        """

        from backend.core.access.db import rockit_db
        from backend.core.framework.downloader.downloader import Downloader

        try:
            async with rockit_db.session_scope_async() as session:
                a_result = await Downloader.download_multiple_medias_async(
                    session=session,
                    user_id=user_id,
                    title="Recommendations",
                    public_ids=media_public_ids,
                )
                if a_result.is_not_ok():
                    logger.error(
                        f"Error auto-downloading recommended media. {a_result.info()}"
                    )
        except Exception as e:
            # Never let a background failure surface as an unhandled task error;
            # the recommendation response has already been sent by now.
            logger.error(f"Auto-download task failed: {e}", exc_info=True)

    @staticmethod
    def _schedule_auto_downloads(
        user_id: int,
        songs: list[BaseSongWithAlbumResponse],
    ) -> None:
        """Fire-and-forget the download of recommended songs that are known to
        this instance but still lack audio, capped at AUTO_DOWNLOAD_LIMIT.
        External suggestions are intentionally excluded."""

        if AUTO_DOWNLOAD_LIMIT <= 0:
            return

        missing_public_ids: list[str] = [s.publicId for s in songs if not s.downloaded][
            :AUTO_DOWNLOAD_LIMIT
        ]

        if not missing_public_ids:
            return

        task = asyncio.create_task(
            Recommendation._auto_download_async(
                user_id=user_id, media_public_ids=missing_public_ids
            )
        )
        # Keep a reference so the task isn't garbage collected mid-flight.
        _BACKGROUND_TASKS.add(task)
        task.add_done_callback(_BACKGROUND_TASKS.discard)

    @staticmethod
    async def _resolve_seed_track_async(
        session: AsyncSession,
        public_id: str,
    ) -> SeedTrack | None:
        """(first artist, name) of a song or a video, so either can seed
        external suggestions. None when the media can't be resolved or
        carries no artist."""

        a_media = await Media.get_media_async(session=session, public_id=public_id)
        if a_media.is_not_ok():
            logger.warning(
                f"Could not resolve seed track {public_id}. {a_media.info()}"
            )
            return None

        media = a_media.result().media
        name: str = getattr(media, "name", "") or ""
        artists = getattr(media, "artists", None)
        if not name or not artists:
            return None

        return SeedTrack(artist_name=artists[0].name, track_name=name)

    @staticmethod
    async def _get_media_ids_async(
        session: AsyncSession, public_ids: list[str]
    ) -> AResult[list[int]]:
        """Internal ids for songs/videos, in no particular order."""

        if not public_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        a_medias: AResult[list[MediaModel]] = (
            await Media.get_medias_from_public_ids_async(
                session=session,
                public_ids=list(dict.fromkeys(public_ids)),
                media_type_keys=[MediaTypeEnum.SONG, MediaTypeEnum.VIDEO],
            )
        )
        if a_medias.is_not_ok():
            logger.error(f"Error resolving media ids. {a_medias.info()}")
            return AResult(code=a_medias.code(), message=a_medias.message())

        return AResult(
            code=AResultCode.OK, message="OK", result=[m.id for m in a_medias.result()]
        )

    @staticmethod
    async def _rank_local_async(
        session: AsyncSession,
        seed_media_ids: list[int],
        exclude_media_ids: list[int],
        exclude_public_ids: set[str],
        limit: int,
    ) -> AResult[list[str]]:
        """Ranked local public_ids: related candidates first, then, if
        history is too sparse to fill the list, the cold-start fallback
        (most played, then newest). An empty library yields []."""

        candidates: list[LocalCandidate] = []
        if seed_media_ids:
            a_candidates = await RecommendationAccess.get_local_candidates_async(
                session=session,
                seed_media_ids=seed_media_ids,
                exclude_media_ids=exclude_media_ids,
                limit=LOCAL_CANDIDATE_LIMIT,
            )
            if a_candidates.is_not_ok():
                logger.error(f"Error loading local candidates. {a_candidates.info()}")
                return AResult(code=a_candidates.code(), message=a_candidates.message())
            candidates = a_candidates.result()

        ranked = RecommendationRanking.rank_local_candidates(
            candidates=candidates, limit=limit, exclude_public_ids=exclude_public_ids
        )
        if len(ranked) >= limit:
            return AResult(code=AResultCode.OK, message="OK", result=ranked)

        a_fallback = await RecommendationAccess.get_fallback_candidates_async(
            session=session,
            exclude_media_ids=list({*exclude_media_ids, *seed_media_ids}),
            limit=LOCAL_CANDIDATE_LIMIT,
        )
        if a_fallback.is_not_ok():
            # The personalized part is still valid; serve it alone.
            logger.warning(f"Fallback candidates unavailable. {a_fallback.info()}")
            return AResult(code=AResultCode.OK, message="OK", result=ranked)

        ranked += RecommendationRanking.rank_local_candidates(
            candidates=a_fallback.result(),
            limit=limit - len(ranked),
            exclude_public_ids=exclude_public_ids | set(ranked),
        )
        return AResult(code=AResultCode.OK, message="OK", result=ranked)

    @staticmethod
    async def _get_local_songs_async(
        session: AsyncSession,
        cache_key: tuple[str, int, str, int] | None,
        seed_media_ids: list[int],
        exclude_media_ids: list[int],
        exclude_public_ids: set[str],
        limit: int,
    ) -> AResult[list[BaseSongWithAlbumResponse]]:
        """Ranked local songs, served from the short-lived cache when
        possible. Songs are always re-resolved so download state is fresh."""

        ranked: list[str] | None = (
            _local_result_cache.get(cache_key) if cache_key else None
        )
        if ranked is None:
            a_ranked = await Recommendation._rank_local_async(
                session=session,
                seed_media_ids=seed_media_ids,
                exclude_media_ids=exclude_media_ids,
                exclude_public_ids=exclude_public_ids,
                limit=limit,
            )
            if a_ranked.is_not_ok():
                return AResult(code=a_ranked.code(), message=a_ranked.message())
            ranked = a_ranked.result()
            if cache_key:
                _local_result_cache.set(cache_key, ranked)

        songs = await Media.resolve_songs_from_public_ids_async(
            session=session, public_ids=ranked
        )
        return AResult(code=AResultCode.OK, message="OK", result=songs)

    @staticmethod
    async def _get_external_settings_async(
        session: AsyncSession, user_id: int
    ) -> tuple[bool, str | None]:
        """(opted in, ListenBrainz username). Missing or unreadable settings
        mean "not opted in" — external calls are never made by default."""

        a_settings = await UserRecommendationSettingsAccess.get_settings_async(
            session=session, user_id=user_id
        )
        if a_settings.is_not_ok():
            if a_settings.code() != AResultCode.NOT_FOUND:
                logger.warning(
                    f"Could not read recommendation settings for user {user_id}. "
                    f"{a_settings.info()}"
                )
            return False, None

        row = a_settings.result()
        return bool(row.external_enabled), row.listenbrainz_username

    @staticmethod
    def _build_discover_item(
        suggestion: ExternalSuggestion,
        provider_name: str,
        public_id: str | None,
    ) -> BaseSearchResultsItem:
        """External suggestion -> the search-result shape the UI already
        knows how to play (publicId set) or download (artist + track via
        /downloader/start-from-search). No URL is invented: providerUrl and
        url stay empty because external providers do not supply playable or
        downloadable links."""

        return BaseSearchResultsItem(
            type="song",
            name=suggestion.track_name,
            providerUrl="",
            imageUrl="",
            artists=[ArtistSearchResultsItem(name=suggestion.artist_name, url="")],
            provider=provider_name,
            downloaded=public_id is not None,
            url=None,
            publicId=public_id,
        )

    @staticmethod
    async def _get_discover_async(
        session: AsyncSession,
        user_id: int,
        context: ExternalRecommendationContext,
        exclude_public_ids: set[str],
    ) -> tuple[list[BaseSearchResultsItem], str | None, EExternalStatus]:
        """External suggestions for an opted-in user, matched against the
        local library in one batched query. Never fails: every problem
        degrades to an empty list with an explanatory status."""

        enabled, username = await Recommendation._get_external_settings_async(
            session=session, user_id=user_id
        )
        if not enabled:
            return [], None, EExternalStatus.DISABLED

        context = ExternalRecommendationContext(
            kind=context.kind, seed=context.seed, listenbrainz_username=username
        )
        exclude_keys: set[tuple[str, str]] = (
            {
                RecommendationRanking.suggestion_key(
                    context.seed.artist_name, context.seed.track_name
                )
            }
            if context.seed
            else set()
        )

        result = await Recommendation.external.get_suggestions_async(
            session=session,
            context=context,
            limit=DISCOVER_LIMIT * 2,
            exclude_keys=exclude_keys,
        )
        if result.status != EExternalStatus.OK or not result.provider_name:
            return [], None, result.status

        # Flag, in one batched local query, suggestions the instance already
        # has downloaded so the UI can play them directly.
        a_in_library: AResult[dict[int, str]] = (
            await RecommendationAccess.get_downloaded_discover_song_public_ids_async(
                session=session,
                artists_and_tracks=[
                    (s.artist_name, s.track_name) for s in result.suggestions
                ],
            )
        )
        in_library: dict[int, str] = {}
        if a_in_library.is_ok():
            in_library = a_in_library.result()
        else:
            logger.warning(
                f"Could not flag in-library suggestions. {a_in_library.info()}"
            )

        discover: list[BaseSearchResultsItem] = []
        seen_public_ids: set[str] = set()
        for idx, suggestion in enumerate(result.suggestions):
            if len(discover) >= DISCOVER_LIMIT:
                break
            # The SQL uses 1-based ordinality.
            public_id = in_library.get(idx + 1)
            if public_id is not None:
                # Already recommended locally, already played, or the seed.
                if public_id in exclude_public_ids or public_id in seen_public_ids:
                    continue
                seen_public_ids.add(public_id)
            discover.append(
                Recommendation._build_discover_item(
                    suggestion=suggestion,
                    provider_name=result.provider_name,
                    public_id=public_id,
                )
            )

        status = EExternalStatus.OK if discover else EExternalStatus.EMPTY
        return discover, result.provider_name if discover else None, status

    @staticmethod
    async def get_related_songs_async(
        session: AsyncSession,
        user_id: int,
        public_id: str,
        limit: int = DEFAULT_RECOMMENDATION_LIMIT,
    ) -> AResult[RecommendationResult]:
        """Songs similar to one seed song or video (excluding the seed
        itself), plus optional external suggestions seeded on it."""

        limit = Recommendation.clamp_limit(limit)

        # Videos are queueable too, so they must be able to seed suggestions —
        # otherwise the queue silently shows nothing while one is playing.
        a_media: AResult[MediaModel] = await Media.get_media_from_public_id_async(
            session=session,
            public_id=public_id,
            media_type_keys=[MediaTypeEnum.SONG, MediaTypeEnum.VIDEO],
        )
        if a_media.is_not_ok():
            logger.error(f"Error resolving seed media {public_id}. {a_media.info()}")
            return AResult(code=a_media.code(), message=a_media.message())

        seed_id: int = a_media.result().id

        a_songs = await Recommendation._get_local_songs_async(
            session=session,
            cache_key=("related", user_id, public_id, limit),
            seed_media_ids=[seed_id],
            exclude_media_ids=[seed_id],
            exclude_public_ids={public_id},
            limit=limit,
        )
        if a_songs.is_not_ok():
            logger.error(
                f"Error computing related songs for {public_id}. {a_songs.info()}"
            )
            return AResult(code=a_songs.code(), message=a_songs.message())
        songs = a_songs.result()

        seed = await Recommendation._resolve_seed_track_async(
            session=session, public_id=public_id
        )
        discover, provider, status = await Recommendation._get_discover_async(
            session=session,
            user_id=user_id,
            context=ExternalRecommendationContext(
                kind=ERecommendationContextKind.SEED, seed=seed
            ),
            exclude_public_ids={public_id, *(s.publicId for s in songs)},
        )

        Recommendation._schedule_auto_downloads(user_id=user_id, songs=songs)

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=RecommendationResult(
                songs=songs,
                discover=discover,
                discover_provider=provider,
                discover_status=status,
            ),
        )

    @staticmethod
    async def get_recommendations_for_user_async(
        session: AsyncSession,
        user_id: int,
        limit: int = DEFAULT_RECOMMENDATION_LIMIT,
    ) -> AResult[RecommendationResult]:
        """Personalized recommendations from the user's own profile.

        Seeds on the user's most-recently-played and liked songs and excludes
        anything they've already listened to or liked, so results are
        new-to-them. Users without history get the cold-start fallback.
        External suggestions (if opted in) come from ListenBrainz for the
        user, or Last.fm seeded on their most recent song.
        """

        limit = Recommendation.clamp_limit(limit)

        a_recent: AResult[list[str]] = (
            await StatsAccess.get_recently_played_songs_async(
                session=session, user_id=user_id, limit=PROFILE_SEED_LIMIT
            )
        )
        recent_ids: list[str] = a_recent.result() if a_recent.is_ok() else []

        a_liked: AResult[list[str]] = (
            await UserLikedMediaAccess.get_user_liked_media_public_ids_async(
                session=session, user_id=user_id
            )
        )
        liked_ids: list[str] = a_liked.result() if a_liked.is_ok() else []

        seed_public_ids: list[str] = list(dict.fromkeys(recent_ids + liked_ids))

        a_seed_ids = await Recommendation._get_media_ids_async(
            session=session, public_ids=seed_public_ids
        )
        if a_seed_ids.is_not_ok():
            logger.error(
                f"Error resolving seed songs for user {user_id}. {a_seed_ids.info()}"
            )
            return AResult(code=a_seed_ids.code(), message=a_seed_ids.message())
        seed_ids = a_seed_ids.result()

        # Exclude everything the user has ever listened to (not just the
        # seed set) so this stays about new-to-them discovery.
        a_all_played: AResult[list[str]] = (
            await StatsAccess.get_recently_played_songs_async(
                session=session, user_id=user_id, limit=PROFILE_EXCLUDE_LIMIT
            )
        )
        played_ids: list[str] = a_all_played.result() if a_all_played.is_ok() else []
        exclude_public_ids: set[str] = {*played_ids, *seed_public_ids}

        a_exclude_ids = await Recommendation._get_media_ids_async(
            session=session, public_ids=list(exclude_public_ids)
        )
        exclude_ids: list[int] = (
            a_exclude_ids.result() if a_exclude_ids.is_ok() else seed_ids
        )

        a_songs = await Recommendation._get_local_songs_async(
            session=session,
            cache_key=("user", user_id, "", limit),
            seed_media_ids=seed_ids,
            exclude_media_ids=exclude_ids,
            exclude_public_ids=exclude_public_ids,
            limit=limit,
        )
        if a_songs.is_not_ok():
            logger.error(
                f"Error computing recommendations for user {user_id}. {a_songs.info()}"
            )
            return AResult(code=a_songs.code(), message=a_songs.message())
        songs = a_songs.result()

        top_seed_public_id = next(iter(recent_ids[:1] or liked_ids[:1]), None)
        seed = (
            await Recommendation._resolve_seed_track_async(
                session=session, public_id=top_seed_public_id
            )
            if top_seed_public_id
            else None
        )
        discover, provider, status = await Recommendation._get_discover_async(
            session=session,
            user_id=user_id,
            context=ExternalRecommendationContext(
                kind=ERecommendationContextKind.USER, seed=seed
            ),
            exclude_public_ids={*exclude_public_ids, *(s.publicId for s in songs)},
        )

        Recommendation._schedule_auto_downloads(user_id=user_id, songs=songs)

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=RecommendationResult(
                songs=songs,
                discover=discover,
                discover_provider=provider,
                discover_status=status,
            ),
        )

    @staticmethod
    async def get_recommendations_for_playlist_async(
        session: AsyncSession,
        user_id: int,
        playlist_public_id: str,
        limit: int = DEFAULT_RECOMMENDATION_LIMIT,
    ) -> AResult[RecommendationResult]:
        """Songs to add to a playlist, related to everything already in it,
        plus optional external suggestions seeded on its first song. Not
        cached: playlists change right after a suggestion is added."""

        limit = Recommendation.clamp_limit(limit)

        a_playlist = await Media.get_playlist_with_medias_async(
            session=session, user_id=user_id, public_id=playlist_public_id
        )
        if a_playlist.is_not_ok():
            logger.error(
                f"Error resolving playlist {playlist_public_id}. {a_playlist.info()}"
            )
            return AResult(code=a_playlist.code(), message=a_playlist.message())

        # Playlists can hold videos alongside songs; both are valid seeds.
        seed_public_ids: list[str] = [
            item.item.publicId
            for item in a_playlist.result().medias
            if isinstance(item.item, (BaseSongWithAlbumResponse, BaseVideoResponse))
        ]
        if not seed_public_ids:
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=RecommendationResult(songs=[], discover=[]),
            )

        a_seed_ids = await Recommendation._get_media_ids_async(
            session=session, public_ids=seed_public_ids
        )
        if a_seed_ids.is_not_ok():
            logger.error(
                f"Error resolving playlist songs for {playlist_public_id}. "
                f"{a_seed_ids.info()}"
            )
            return AResult(code=a_seed_ids.code(), message=a_seed_ids.message())
        seed_ids = a_seed_ids.result()

        a_songs = await Recommendation._get_local_songs_async(
            session=session,
            cache_key=None,
            seed_media_ids=seed_ids,
            exclude_media_ids=seed_ids,
            exclude_public_ids=set(seed_public_ids),
            limit=limit,
        )
        if a_songs.is_not_ok():
            logger.error(
                f"Error computing recommendations for playlist {playlist_public_id}. "
                f"{a_songs.info()}"
            )
            return AResult(code=a_songs.code(), message=a_songs.message())
        songs = a_songs.result()

        seed = await Recommendation._resolve_seed_track_async(
            session=session, public_id=seed_public_ids[0]
        )
        discover, provider, status = await Recommendation._get_discover_async(
            session=session,
            user_id=user_id,
            context=ExternalRecommendationContext(
                kind=ERecommendationContextKind.SEED, seed=seed
            ),
            exclude_public_ids={*seed_public_ids, *(s.publicId for s in songs)},
        )

        Recommendation._schedule_auto_downloads(user_id=user_id, songs=songs)

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=RecommendationResult(
                songs=songs,
                discover=discover,
                discover_provider=provider,
                discover_status=status,
            ),
        )
