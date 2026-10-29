import time
from typing import NamedTuple

from sqlalchemy.ext.asyncio import AsyncSession

from core.access.recommendationAccess import (
    LOCAL_CANDIDATE_LIMIT,
    RecommendationAccess,
)
from core.access.statsAccess import StatsAccess
from core.access.userLikedMediaAccess import UserLikedMediaAccess
from core.enums.mediaTypeEnum import MediaTypeEnum
from core.framework.externalRecommendation.externalRecommendations import (
    ExternalRecommendations,
    external_recommendations,
)
from core.framework.media.media import Media
from core.framework.models.media import MediaModel
from core.framework.models.recommendation import (
    EExternalStatus,
    ERecommendationContextKind,
    ExternalRecommendationContext,
    ExternalSuggestion,
    LocalCandidate,
    SeedTrack,
)
from core.framework.recommendationRanking import RecommendationRanking
from core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from core.responses.baseVideoResponse import BaseVideoResponse
from core.responses.searchResponse import (
    ArtistSearchResultsItem,
    BaseSearchResultsItem,
)
from core.responses.songListResponse import SongListResponse
from logger import getLogger
from result import Result, ResultCode

logger = getLogger(__name__)

DEFAULT_RECOMMENDATION_LIMIT = 20
MAX_RECOMMENDATION_LIMIT = 50
# How many of the user's own top/liked songs to seed a personalized feed with.
PROFILE_SEED_LIMIT = 25
# Keep a short recent-listen exclusion window; older familiar music can
# return as fallback instead of exhausting small libraries.
PROFILE_EXCLUDE_LIMIT = 5
# How many external (not-yet-downloaded) suggestions to show per request.
DISCOVER_LIMIT = 8
# Ranked local results are reused for this long, so re-rendering the home
# page or reopening the player does not re-run the candidate query.
LOCAL_RESULT_CACHE_SECONDS = 60.0
LOCAL_RESULT_CACHE_MAX_ENTRIES = 512


class _LocalResultCache:
    """Tiny in-process TTL cache for ranked public_id lists. Bounded; the
    oldest entries are dropped first."""

    def __init__(self, ttl_seconds: float, max_entries: int) -> None:
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
    """Recommendations = local engine (always) + registered external discovery.

    The local engine ranks songs already known to this instance from
    Rockit's own data (see RecommendationRanking) and never touches the
    network. Configured external suggestions are enabled instance-wide and purely additive:
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
    async def _resolve_seed_track_async(
        session: AsyncSession,
        public_id: str,
    ) -> SeedTrack | None:
        """(first artist, name) of a song or a video, so either can seed
        external suggestions. None when the media can't be resolved or
        carries no artist."""

        a_media = await Media.get_media_async(session=session, public_id=public_id)
        if a_media.is_not_ok():
            logger.warning(f"Could not resolve seed track {public_id}. {a_media.info()}")
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
    ) -> Result[list[int]]:
        """Internal ids for songs/videos, in no particular order."""

        if not public_ids:
            return Result(code=ResultCode.OK, message="OK", result=[])

        a_medias: Result[list[MediaModel]] = await Media.get_medias_from_public_ids_async(
            session=session,
            public_ids=list(dict.fromkeys(public_ids)),
            media_type_keys=[MediaTypeEnum.SONG, MediaTypeEnum.VIDEO],
        )
        if a_medias.is_not_ok():
            logger.error(f"Error resolving media ids. {a_medias.info()}")
            return Result(code=a_medias.code(), message=a_medias.message())

        return Result(code=ResultCode.OK, message="OK", result=[m.id for m in a_medias.result()])

    @staticmethod
    async def _rank_local_async(
        session: AsyncSession,
        seed_media_ids: list[int],
        exclude_media_ids: list[int],
        exclude_public_ids: set[str],
        limit: int,
        rotation_key: str = "",
        user_id: int = 0,
    ) -> Result[list[str]]:
        """Ranked local public_ids: related candidates first, then, if
        history is too sparse to fill the list, the rotating cold-start fallback. An empty
        library yields [].
        """

        candidates: list[LocalCandidate] = []
        if seed_media_ids:
            a_candidates = await RecommendationAccess.get_local_candidates_async(
                session=session,
                seed_media_ids=seed_media_ids,
                exclude_media_ids=exclude_media_ids,
                limit=LOCAL_CANDIDATE_LIMIT,
                user_id=user_id,
            )
            if a_candidates.is_not_ok():
                logger.error(f"Error loading local candidates. {a_candidates.info()}")
                return Result(code=a_candidates.code(), message=a_candidates.message())
            candidates = a_candidates.result()

        ranked = RecommendationRanking.rank_local_candidates(
            candidates=candidates,
            limit=limit,
            exclude_public_ids=exclude_public_ids,
            rotation_key=rotation_key,
        )
        if len(ranked) >= limit:
            return Result(code=ResultCode.OK, message="OK", result=ranked)

        a_fallback = await RecommendationAccess.get_fallback_candidates_async(
            session=session,
            exclude_media_ids=list(set(exclude_media_ids)),
            limit=LOCAL_CANDIDATE_LIMIT,
            rotation_key=rotation_key,
        )
        if a_fallback.is_not_ok():
            # The personalized part is still valid; serve it alone.
            logger.warning(f"Fallback candidates unavailable. {a_fallback.info()}")
            return Result(code=ResultCode.OK, message="OK", result=ranked)

        ranked += RecommendationRanking.rank_local_candidates(
            candidates=a_fallback.result(),
            limit=limit - len(ranked),
            exclude_public_ids=exclude_public_ids | set(ranked),
            rotation_key=rotation_key,
        )
        return Result(code=ResultCode.OK, message="OK", result=ranked)

    @staticmethod
    async def _get_local_songs_async(
        session: AsyncSession,
        cache_key: tuple[str, int, str, int] | None,
        seed_media_ids: list[int],
        exclude_media_ids: list[int],
        exclude_public_ids: set[str],
        limit: int,
    ) -> Result[list[BaseSongWithAlbumResponse]]:
        """Ranked local songs, served from the short-lived cache when
        possible. Songs are always re-resolved so download state is fresh."""

        ranked: list[str] | None = _local_result_cache.get(cache_key) if cache_key else None
        if ranked is None:
            a_ranked = await Recommendation._rank_local_async(
                session=session,
                seed_media_ids=seed_media_ids,
                exclude_media_ids=exclude_media_ids,
                exclude_public_ids=exclude_public_ids,
                limit=limit,
                rotation_key=f"{cache_key[1] if cache_key else 0}:{int(time.time() // 21600)}",
                user_id=cache_key[1] if cache_key else 0,
            )
            if a_ranked.is_not_ok():
                return Result(code=a_ranked.code(), message=a_ranked.message())
            ranked = a_ranked.result()
            if cache_key:
                _local_result_cache.set(cache_key, ranked)

        songs = await Media.resolve_songs_from_public_ids_async(
            session=session,
            public_ids=[pid for pid in ranked if pid not in exclude_public_ids],
        )
        return Result(code=ResultCode.OK, message="OK", result=songs)

    @staticmethod
    def build_discover_item(
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
        context: ExternalRecommendationContext,
        exclude_public_ids: set[str],
        include_external: bool = True,
    ) -> tuple[list[BaseSearchResultsItem], str | None, EExternalStatus]:
        """Suggestions from registered external providers, matched against the
        local library in one batched query. Never fails: every problem
        degrades to an empty list with an explanatory status."""

        if not include_external:
            return [], None, EExternalStatus.DISABLED

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

        # Match generic search metadata, then delegate availability to each
        # media provider instead of recognizing provider names in core.
        a_matches = await RecommendationAccess.get_discover_song_candidates_async(
            session=session,
            artists_and_tracks=[(s.artist_name, s.track_name) for s in result.suggestions],
        )
        matches: dict[int, list[str]] = {}
        if a_matches.is_ok():
            matches = a_matches.result()
        else:
            logger.error(f"Could not match in-library suggestions. {a_matches.info()}")
        candidate_ids = list(dict.fromkeys(pid for group in matches.values() for pid in group))
        resolved = await Media.resolve_songs_from_public_ids_async(
            session=session, public_ids=candidate_ids
        )
        downloaded = {song.publicId for song in resolved if song.downloaded}
        in_library = {
            idx: next((pid for pid in ids if pid in downloaded), None)
            for idx, ids in matches.items()
        }

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
                Recommendation.build_discover_item(
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
        include_external: bool = True,
    ) -> Result[RecommendationResult]:
        """Songs similar to one seed song or video (excluding the seed
        itself), plus optional external suggestions seeded on it."""

        limit = Recommendation.clamp_limit(limit)

        # Videos are queueable too, so they must be able to seed suggestions —
        # otherwise the queue silently shows nothing while one is playing.
        a_media: Result[MediaModel] = await Media.get_media_from_public_id_async(
            session=session,
            public_id=public_id,
            media_type_keys=[MediaTypeEnum.SONG, MediaTypeEnum.VIDEO],
        )
        if a_media.is_not_ok():
            logger.error(f"Error resolving seed media {public_id}. {a_media.info()}")
            return Result(code=a_media.code(), message=a_media.message())

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
            logger.error(f"Error computing related songs for {public_id}. {a_songs.info()}")
            return Result(code=a_songs.code(), message=a_songs.message())
        songs = a_songs.result()

        seed = await Recommendation._resolve_seed_track_async(session=session, public_id=public_id)
        discover, provider, status = await Recommendation._get_discover_async(
            session=session,
            context=ExternalRecommendationContext(kind=ERecommendationContextKind.SEED, seed=seed),
            exclude_public_ids={public_id, *(s.publicId for s in songs)},
            include_external=include_external,
        )

        return Result(
            code=ResultCode.OK,
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
        include_external: bool = True,
    ) -> Result[RecommendationResult]:
        """Personalized recommendations from the user's own profile.

        Seeds on recent plays and likes, excludes the last five listens, and
        penalizes frequent repeats over the last two weeks. Older familiar
        songs remain eligible when discovery is sparse. Users without history get the
        cold-start fallback.
        External providers receive the most recent song's artist and title as
        a generic seed. Their configuration belongs to each integration.
        """

        limit = Recommendation.clamp_limit(limit)

        a_recent: Result[list[str]] = await StatsAccess.get_recently_played_songs_async(
            session=session, user_id=user_id, limit=PROFILE_SEED_LIMIT
        )
        recent_ids: list[str] = a_recent.result() if a_recent.is_ok() else []

        a_liked: Result[
            list[str]
        ] = await UserLikedMediaAccess.get_user_liked_media_public_ids_async(
            session=session, user_id=user_id
        )
        liked_ids: list[str] = a_liked.result() if a_liked.is_ok() else []

        seed_public_ids: list[str] = list(
            dict.fromkeys(recent_ids + liked_ids[:PROFILE_SEED_LIMIT])
        )

        a_seed_ids = await Recommendation._get_media_ids_async(
            session=session, public_ids=seed_public_ids
        )
        if a_seed_ids.is_not_ok():
            logger.error(f"Error resolving seed songs for user {user_id}. {a_seed_ids.info()}")
            return Result(code=a_seed_ids.code(), message=a_seed_ids.message())
        seed_ids = a_seed_ids.result()

        # Exclude the most recent listens while retaining older familiar
        # music as fallback, especially on smaller self-hosted libraries.
        a_all_played: Result[list[str]] = await StatsAccess.get_recently_played_songs_async(
            session=session, user_id=user_id, limit=PROFILE_EXCLUDE_LIMIT
        )
        played_ids: list[str] = a_all_played.result() if a_all_played.is_ok() else []
        exclude_public_ids: set[str] = set(played_ids)

        a_exclude_ids = await Recommendation._get_media_ids_async(
            session=session, public_ids=list(exclude_public_ids)
        )
        exclude_ids: list[int] = a_exclude_ids.result() if a_exclude_ids.is_ok() else seed_ids

        a_songs = await Recommendation._get_local_songs_async(
            session=session,
            cache_key=("user", user_id, "", limit),
            seed_media_ids=seed_ids,
            exclude_media_ids=exclude_ids,
            exclude_public_ids=exclude_public_ids,
            limit=limit,
        )
        if a_songs.is_not_ok():
            logger.error(f"Error computing recommendations for user {user_id}. {a_songs.info()}")
            return Result(code=a_songs.code(), message=a_songs.message())
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
            context=ExternalRecommendationContext(kind=ERecommendationContextKind.USER, seed=seed),
            exclude_public_ids={*exclude_public_ids, *(s.publicId for s in songs)},
            include_external=include_external,
        )

        return Result(
            code=ResultCode.OK,
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
        include_external: bool = True,
    ) -> Result[RecommendationResult]:
        """Songs to add to a playlist, related to everything already in it,
        plus optional external suggestions seeded on its first song. Not
        cached: playlists change right after a suggestion is added."""

        limit = Recommendation.clamp_limit(limit)

        a_playlist = await Media.get_playlist_with_medias_async(
            session=session, user_id=user_id, public_id=playlist_public_id
        )
        if a_playlist.is_not_ok():
            logger.error(f"Error resolving playlist {playlist_public_id}. {a_playlist.info()}")
            return Result(code=a_playlist.code(), message=a_playlist.message())

        # Playlists can hold videos alongside songs; both are valid seeds.
        seed_public_ids: list[str] = [
            item.item.publicId
            for item in a_playlist.result().medias
            if isinstance(item.item, (BaseSongWithAlbumResponse, BaseVideoResponse))
        ]
        if not seed_public_ids:
            return Result(
                code=ResultCode.OK,
                message="OK",
                result=RecommendationResult(songs=[], discover=[]),
            )

        a_seed_ids = await Recommendation._get_media_ids_async(
            session=session, public_ids=seed_public_ids
        )
        if a_seed_ids.is_not_ok():
            logger.error(
                f"Error resolving playlist songs for {playlist_public_id}. {a_seed_ids.info()}"
            )
            return Result(code=a_seed_ids.code(), message=a_seed_ids.message())
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
            return Result(code=a_songs.code(), message=a_songs.message())
        songs = a_songs.result()

        seed = await Recommendation._resolve_seed_track_async(
            session=session, public_id=seed_public_ids[0]
        )
        discover, provider, status = await Recommendation._get_discover_async(
            session=session,
            context=ExternalRecommendationContext(kind=ERecommendationContextKind.SEED, seed=seed),
            exclude_public_ids={*seed_public_ids, *(s.publicId for s in songs)},
            include_external=include_external,
        )

        return Result(
            code=ResultCode.OK,
            message="OK",
            result=RecommendationResult(
                songs=songs,
                discover=discover,
                discover_provider=provider,
                discover_status=status,
            ),
        )
