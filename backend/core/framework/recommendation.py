import asyncio
from typing import List, NamedTuple

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.access.statsAccess import StatsAccess
from backend.core.access.recommendationAccess import RecommendationAccess
from backend.core.access.userLikedMediaAccess import UserLikedMediaAccess
from backend.core.access.lastfmCacheAccess import LastfmCacheAccess, build_cache_key

from backend.core.enums.mediaTypeEnum import MediaTypeEnum

from backend.core.framework.media.media import Media
from backend.core.framework.models.media import MediaModel
from backend.core.framework.lastfmClient import LastfmClient, SimilarTrack

from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.searchResponse import BaseSearchResultsItem

logger = getLogger(__name__)

DEFAULT_RECOMMENDATION_LIMIT = 20
# How many of the user's own top/liked songs to seed a personalized feed with.
PROFILE_SEED_LIMIT = 25
# How far back into a user's own listen history to look when excluding
# already-known songs from their personalized feed.
PROFILE_EXCLUDE_LIMIT = 10000
# How many not-yet-downloaded songs to surface per request, sourced from
# Last.fm and resolved through Rockit's own multi-provider search.
DISCOVER_LIMIT = 8
# How many Last.fm suggestions to try resolving to fill DISCOVER_LIMIT slots
# (some won't match anything searchable, or will already be downloaded).
DISCOVER_CANDIDATE_POOL = 15


class RecommendationResult(NamedTuple):
    songs: List[BaseSongWithAlbumResponse]
    # Similar songs this Rockit instance doesn't have downloaded yet. Tap
    # providerUrl through /downloader/start-from-url to fetch one. Always
    # empty unless LASTFM_API_KEY is configured.
    discover: List[BaseSearchResultsItem]


class Recommendation:
    @staticmethod
    async def _get_discover_songs_async(
        session: AsyncSession,
        seed_song: BaseSongWithAlbumResponse,
        limit: int = DISCOVER_LIMIT,
    ) -> List[BaseSearchResultsItem]:
        """Songs similar to seed_song, per Last.fm, that this Rockit
        instance doesn't have downloaded yet — resolved to a real,
        addable URL via the existing multi-provider search. Returns []
        if LASTFM_API_KEY isn't set, Last.fm has nothing, or nothing
        resolves to an undownloaded song."""

        if not LastfmClient.is_configured() or not seed_song.artists:
            return []

        seed_artist_name = seed_song.artists[0].name
        cache_key = build_cache_key(seed_artist_name, seed_song.name)

        a_cached = await LastfmCacheAccess.get_cached_similar_tracks_async(
            session=session, cache_key=cache_key
        )
        similar_tracks: List[SimilarTrack] | None = (
            a_cached.result() if a_cached.is_ok() else None
        )

        if similar_tracks is None:
            a_fresh = await LastfmClient.get_similar_tracks_async(
                artist_name=seed_artist_name,
                track_name=seed_song.name,
                limit=DISCOVER_CANDIDATE_POOL,
            )
            similar_tracks = a_fresh.result() if a_fresh.is_ok() else []
            if similar_tracks:
                await LastfmCacheAccess.set_cached_similar_tracks_async(
                    session=session, cache_key=cache_key, tracks=similar_tracks
                )

        if not similar_tracks:
            return []

        search_tasks = [
            Media.search_async(
                session=session,
                query=f"{t['artist_name']} {t['track_name']}",
            )
            for t in similar_tracks
        ]
        search_results = await asyncio.gather(*search_tasks, return_exceptions=True)

        discover: List[BaseSearchResultsItem] = []
        seen_names: set[str] = {seed_song.name.strip().lower()}
        for result in search_results:
            if len(discover) >= limit:
                break
            if isinstance(result, BaseException):
                logger.warning(f"Discover search failed: {result}")
                continue
            if result.is_not_ok():
                continue

            for item in result.result().results:
                dedup_key = item.name.strip().lower()
                if item.type != "song" or item.downloaded or dedup_key in seen_names:
                    continue
                seen_names.add(dedup_key)
                discover.append(item)
                break

        return discover

    @staticmethod
    async def get_related_songs_async(
        session: AsyncSession,
        public_id: str,
        limit: int = DEFAULT_RECOMMENDATION_LIMIT,
    ) -> AResult[RecommendationResult]:
        """Songs similar to one seed song: known ones ranked by co-occurrence
        (shared playlists, shared listening sessions), plus songs Last.fm
        considers similar that aren't downloaded here yet."""

        a_media: AResult[MediaModel] = await Media.get_media_from_public_id_async(
            session=session,
            public_id=public_id,
            media_type_keys=[MediaTypeEnum.SONG],
        )
        if a_media.is_not_ok():
            logger.error(f"Error resolving seed song {public_id}. {a_media.info()}")
            return AResult(code=a_media.code(), message=a_media.message())

        seed_id: int = a_media.result().id

        a_similar: AResult[List[str]] = (
            await RecommendationAccess.get_similar_song_ids_async(
                session=session,
                seed_media_ids=[seed_id],
                exclude_media_ids=[seed_id],
                limit=limit,
            )
        )
        if a_similar.is_not_ok():
            logger.error(
                f"Error computing related songs for {public_id}. {a_similar.info()}"
            )
            return AResult(code=a_similar.code(), message=a_similar.message())

        songs: List[BaseSongWithAlbumResponse] = (
            await Media.resolve_songs_from_public_ids_async(
                session=session, public_ids=a_similar.result()
            )
        )

        seed_song: BaseSongWithAlbumResponse | None = next(
            (
                s
                for s in await Media.resolve_songs_from_public_ids_async(
                    session=session, public_ids=[public_id]
                )
            ),
            None,
        )
        discover: List[BaseSearchResultsItem] = (
            await Recommendation._get_discover_songs_async(
                session=session, seed_song=seed_song
            )
            if seed_song is not None
            else []
        )

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=RecommendationResult(songs=songs, discover=discover),
        )

    @staticmethod
    async def get_recommendations_for_user_async(
        session: AsyncSession,
        user_id: int,
        limit: int = DEFAULT_RECOMMENDATION_LIMIT,
    ) -> AResult[RecommendationResult]:
        """Personalized recommendations from the user's own listening profile.

        Seeds on the user's most-recently-played and liked songs; excludes
        anything they've already listened to, so results are new-to-them.
        Also includes Last.fm-sourced discovery seeded on their single most
        recent song (kept to one seed to bound the extra latency).
        """

        a_recent: AResult[List[str]] = (
            await StatsAccess.get_recently_played_songs_async(
                session=session, user_id=user_id, limit=PROFILE_SEED_LIMIT
            )
        )
        recent_ids: List[str] = a_recent.result() if a_recent.is_ok() else []

        a_liked: AResult[List[str]] = (
            await UserLikedMediaAccess.get_user_liked_media_public_ids_async(
                session=session, user_id=user_id
            )
        )
        liked_ids: List[str] = a_liked.result() if a_liked.is_ok() else []

        seed_public_ids: List[str] = list(dict.fromkeys(recent_ids + liked_ids))
        if not seed_public_ids:
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=RecommendationResult(songs=[], discover=[]),
            )

        a_seed_medias: AResult[List[MediaModel]] = (
            await Media.get_medias_from_public_ids_async(
                session=session,
                public_ids=seed_public_ids,
                media_type_keys=[MediaTypeEnum.SONG],
            )
        )
        if a_seed_medias.is_not_ok():
            logger.error(
                f"Error resolving seed songs for user {user_id}. {a_seed_medias.info()}"
            )
            return AResult(code=a_seed_medias.code(), message=a_seed_medias.message())

        seed_ids: List[int] = [m.id for m in a_seed_medias.result()]

        # Exclude everything the user has ever listened to (not just the
        # seed set) so this stays about new-to-them discovery.
        a_all_played: AResult[List[str]] = (
            await StatsAccess.get_recently_played_songs_async(
                session=session, user_id=user_id, limit=PROFILE_EXCLUDE_LIMIT
            )
        )
        played_ids: List[str] = a_all_played.result() if a_all_played.is_ok() else []
        exclude_public_ids: List[str] = list(
            dict.fromkeys(played_ids + seed_public_ids)
        )

        a_exclude_medias: AResult[List[MediaModel]] = (
            await Media.get_medias_from_public_ids_async(
                session=session,
                public_ids=exclude_public_ids,
                media_type_keys=[MediaTypeEnum.SONG],
            )
        )
        exclude_ids: List[int] = (
            [m.id for m in a_exclude_medias.result()]
            if a_exclude_medias.is_ok()
            else seed_ids
        )

        a_similar: AResult[List[str]] = (
            await RecommendationAccess.get_similar_song_ids_async(
                session=session,
                seed_media_ids=seed_ids,
                exclude_media_ids=exclude_ids,
                limit=limit,
            )
        )
        if a_similar.is_not_ok():
            logger.error(
                f"Error computing recommendations for user {user_id}. {a_similar.info()}"
            )
            return AResult(code=a_similar.code(), message=a_similar.message())

        songs: List[BaseSongWithAlbumResponse] = (
            await Media.resolve_songs_from_public_ids_async(
                session=session, public_ids=a_similar.result()
            )
        )

        top_seed_songs: List[BaseSongWithAlbumResponse] = (
            await Media.resolve_songs_from_public_ids_async(
                session=session, public_ids=recent_ids[:1] or liked_ids[:1]
            )
        )
        discover: List[BaseSearchResultsItem] = (
            await Recommendation._get_discover_songs_async(
                session=session, seed_song=top_seed_songs[0]
            )
            if top_seed_songs
            else []
        )

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=RecommendationResult(songs=songs, discover=discover),
        )

    @staticmethod
    async def get_recommendations_for_playlist_async(
        session: AsyncSession,
        user_id: int,
        playlist_public_id: str,
        limit: int = DEFAULT_RECOMMENDATION_LIMIT,
    ) -> AResult[RecommendationResult]:
        """Songs to add to a playlist: known ones by co-occurrence with
        everything already in it, plus Last.fm discovery seeded on the
        playlist's first song."""

        a_playlist = await Media.get_playlist_with_medias_async(
            session=session, user_id=user_id, public_id=playlist_public_id
        )
        if a_playlist.is_not_ok():
            logger.error(
                f"Error resolving playlist {playlist_public_id}. {a_playlist.info()}"
            )
            return AResult(code=a_playlist.code(), message=a_playlist.message())

        seed_public_ids: List[str] = [
            item.item.publicId
            for item in a_playlist.result().medias
            if isinstance(item.item, BaseSongWithAlbumResponse)
        ]
        if not seed_public_ids:
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=RecommendationResult(songs=[], discover=[]),
            )

        a_seed_medias: AResult[List[MediaModel]] = (
            await Media.get_medias_from_public_ids_async(
                session=session,
                public_ids=seed_public_ids,
                media_type_keys=[MediaTypeEnum.SONG],
            )
        )
        if a_seed_medias.is_not_ok():
            logger.error(
                f"Error resolving playlist songs for {playlist_public_id}. "
                f"{a_seed_medias.info()}"
            )
            return AResult(code=a_seed_medias.code(), message=a_seed_medias.message())

        seed_ids: List[int] = [m.id for m in a_seed_medias.result()]

        a_similar: AResult[List[str]] = (
            await RecommendationAccess.get_similar_song_ids_async(
                session=session,
                seed_media_ids=seed_ids,
                exclude_media_ids=seed_ids,
                limit=limit,
            )
        )
        if a_similar.is_not_ok():
            logger.error(
                f"Error computing recommendations for playlist {playlist_public_id}. "
                f"{a_similar.info()}"
            )
            return AResult(code=a_similar.code(), message=a_similar.message())

        songs: List[BaseSongWithAlbumResponse] = (
            await Media.resolve_songs_from_public_ids_async(
                session=session, public_ids=a_similar.result()
            )
        )

        top_seed_songs: List[BaseSongWithAlbumResponse] = (
            await Media.resolve_songs_from_public_ids_async(
                session=session, public_ids=seed_public_ids[:1]
            )
        )
        discover: List[BaseSearchResultsItem] = (
            await Recommendation._get_discover_songs_async(
                session=session, seed_song=top_seed_songs[0]
            )
            if top_seed_songs
            else []
        )

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=RecommendationResult(songs=songs, discover=discover),
        )
