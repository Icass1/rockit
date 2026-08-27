import asyncio
from typing import NamedTuple

from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.access.lastfmCacheAccess import LastfmCacheAccess, build_cache_key
from backend.core.access.recommendationAccess import RecommendationAccess
from backend.core.access.statsAccess import StatsAccess
from backend.core.access.userLikedMediaAccess import UserLikedMediaAccess
from backend.core.aResult import AResult, AResultCode
from backend.core.enums.mediaTypeEnum import MediaTypeEnum
from backend.core.framework.lastfmClient import LastfmClient, SimilarTrack
from backend.core.framework.media.media import Media
from backend.core.framework.models.media import MediaModel
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseVideoResponse import BaseVideoResponse
from backend.core.responses.searchResponse import (
    ArtistSearchResultsItem,
    BaseSearchResultsItem,
)
from backend.utils.logger import getLogger

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
# How many recommended songs to fetch to the server automatically per request.
# Each one costs a yt-dlp download, so this stays well below DISCOVER_LIMIT:
# the rest remain visible and downloadable on demand. Set to 0 to disable
# auto-downloading entirely.
AUTO_DOWNLOAD_LIMIT = 3
# Marks a suggestion that no provider could resolve to a fetchable URL. The
# frontend shows these greyed out and offers no download action.
LASTFM_PROVIDER_NAME = "Last.fm"

# Strong references to in-flight auto-download tasks. asyncio only keeps weak
# references, so without this a task can be garbage collected mid-download.
_BACKGROUND_TASKS: set["asyncio.Task[None]"] = set()


class RecommendationResult(NamedTuple):
    songs: list[BaseSongWithAlbumResponse]
    # Similar songs this Rockit instance doesn't have downloaded yet. Tap
    # providerUrl through /downloader/start-from-url to fetch one. Always
    # empty unless LASTFM_API_KEY is configured.
    discover: list[BaseSearchResultsItem]


class Recommendation:
    @staticmethod
    async def _auto_download_async(
        user_id: int,
        media_public_ids: list[str],
        urls: list[str],
    ) -> None:
        """Queue server-side downloads for recommended songs that have no
        audio file yet.

        Runs detached from the request, on its own session, because the
        request's session is closed as soon as the response is sent and
        resolving a URL costs a provider round-trip. Re-queueing is safe:
        the downloader skips media already downloaded or in progress.
        """

        from backend.core.access.db import rockit_db
        from backend.core.framework.downloader.downloader import Downloader

        try:
            async with rockit_db.session_scope_async() as session:
                if media_public_ids:
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

                for url in urls:
                    a_result_url = await Downloader.start_download_from_url_async(
                        session=session,
                        user_id=user_id,
                        url=url,
                        add_to_library=False,
                        add_to_playlist=False,
                        playlist_public_id=None,
                    )
                    if a_result_url.is_not_ok():
                        logger.error(
                            f"Error auto-downloading recommendation '{url}'. "
                            f"{a_result_url.info()}"
                        )
        except Exception as e:
            # Never let a background failure surface as an unhandled task error;
            # the recommendation response has already been sent by now.
            logger.error(f"Auto-download task failed: {e}", exc_info=True)

    @staticmethod
    def _schedule_auto_downloads(
        user_id: int,
        songs: list[BaseSongWithAlbumResponse],
        discover: list[BaseSearchResultsItem],
    ) -> None:
        """Fire-and-forget the download of recommendations lacking audio,
        newest-first, capped at AUTO_DOWNLOAD_LIMIT items in total."""

        if AUTO_DOWNLOAD_LIMIT <= 0:
            return

        missing_public_ids: list[str] = [s.publicId for s in songs if not s.downloaded]
        remaining: int = max(0, AUTO_DOWNLOAD_LIMIT - len(missing_public_ids))
        # Suggestions with no providerUrl could not be resolved to anything
        # fetchable — they are display-only.
        fetchable: list[str] = [d.providerUrl for d in discover if d.providerUrl]
        urls: list[str] = fetchable[:remaining]
        missing_public_ids = missing_public_ids[:AUTO_DOWNLOAD_LIMIT]

        if not missing_public_ids and not urls:
            return

        task = asyncio.create_task(
            Recommendation._auto_download_async(
                user_id=user_id, media_public_ids=missing_public_ids, urls=urls
            )
        )
        # Keep a reference so the task isn't garbage collected mid-flight.
        _BACKGROUND_TASKS.add(task)
        task.add_done_callback(_BACKGROUND_TASKS.discard)

    @staticmethod
    async def _resolve_seed_track_async(
        session: AsyncSession,
        public_id: str,
    ) -> tuple[str, str]:
        """Return (track name, first artist name) for a song or a video, so
        either can seed Last.fm suggestions. Returns ("", "") when the media
        can't be resolved or carries no artist."""

        a_media = await Media.get_media_async(session=session, public_id=public_id)
        if a_media.is_not_ok():
            logger.warning(
                f"Could not resolve seed track {public_id}. {a_media.info()}"
            )
            return "", ""

        media = a_media.result().media
        artists = getattr(media, "artists", None)
        if not artists:
            return getattr(media, "name", ""), ""

        return getattr(media, "name", ""), artists[0].name

    @staticmethod
    async def _get_discover_songs_async(
        session: AsyncSession,
        seed_name: str,
        seed_artist_name: str,
        limit: int = DISCOVER_LIMIT,
    ) -> list[BaseSearchResultsItem]:
        """Songs similar to the seed track, per Last.fm, that this Rockit
        instance doesn't have downloaded yet — resolved to a real, addable
        URL via the existing multi-provider search.

        Takes plain name/artist strings rather than a song response so a
        video can seed suggestions too. Returns [] if LASTFM_API_KEY isn't
        set, the seed has no artist, or Last.fm has nothing."""

        cache_key = build_cache_key(seed_artist_name, seed_name)

        a_cached = await LastfmCacheAccess.get_cached_similar_tracks_async(
            session=session, cache_key=cache_key
        )
        similar_tracks: list[SimilarTrack] | None = (
            a_cached.result() if a_cached.is_ok() else None
        )

        if similar_tracks is None:
            a_fresh = await LastfmClient.get_similar_tracks_async(
                artist_name=seed_artist_name,
                track_name=seed_name,
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

        discover: list[BaseSearchResultsItem] = []
        seen_names: set[str] = {seed_name.strip().lower()}

        for track, result in zip(similar_tracks, search_results):
            if len(discover) >= limit:
                break

            dedup_key = track["track_name"].strip().lower()
            if dedup_key in seen_names:
                continue

            if isinstance(result, BaseException):
                logger.warning(f"Discover search failed: {result}")
                resolved = None
            elif result.is_not_ok():
                resolved = None
            else:
                resolved = next(
                    (
                        item
                        for item in result.result().results
                        if item.type == "song"
                        and not item.downloaded
                        and item.name.strip().lower() not in seen_names
                    ),
                    None,
                )

            seen_names.add(dedup_key)

            if resolved is not None:
                seen_names.add(resolved.name.strip().lower())
                discover.append(resolved)
                continue

            # No provider match: still surface the suggestion so the user can
            # see it, with an empty providerUrl marking it as not fetchable.
            discover.append(
                BaseSearchResultsItem(
                    type="song",
                    name=track["track_name"],
                    providerUrl="",
                    imageUrl="",
                    artists=[
                        ArtistSearchResultsItem(name=track["artist_name"], url="")
                    ],
                    provider=LASTFM_PROVIDER_NAME,
                    downloaded=False,
                    url=None,
                )
            )

        return discover

    @staticmethod
    async def get_related_songs_async(
        session: AsyncSession,
        user_id: int,
        public_id: str,
        limit: int = DEFAULT_RECOMMENDATION_LIMIT,
    ) -> AResult[RecommendationResult]:
        """Songs similar to one seed song: known ones ranked by co-occurrence
        (shared playlists, shared listening sessions), plus songs Last.fm
        considers similar that aren't downloaded here yet."""

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

        a_similar: AResult[list[str]] = (
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

        songs: list[BaseSongWithAlbumResponse] = (
            await Media.resolve_songs_from_public_ids_async(
                session=session, public_ids=a_similar.result()
            )
        )

        seed_name, seed_artist = await Recommendation._resolve_seed_track_async(
            session=session, public_id=public_id
        )
        discover: list[BaseSearchResultsItem] = (
            await Recommendation._get_discover_songs_async(
                session=session,
                seed_name=seed_name,
                seed_artist_name=seed_artist,
            )
            if seed_name
            else []
        )

        Recommendation._schedule_auto_downloads(
            user_id=user_id, songs=songs, discover=discover
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
        if not seed_public_ids:
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=RecommendationResult(songs=[], discover=[]),
            )

        a_seed_medias: AResult[list[MediaModel]] = (
            await Media.get_medias_from_public_ids_async(
                session=session,
                public_ids=seed_public_ids,
                media_type_keys=[MediaTypeEnum.SONG, MediaTypeEnum.VIDEO],
            )
        )
        if a_seed_medias.is_not_ok():
            logger.error(
                f"Error resolving seed songs for user {user_id}. {a_seed_medias.info()}"
            )
            return AResult(code=a_seed_medias.code(), message=a_seed_medias.message())

        seed_ids: list[int] = [m.id for m in a_seed_medias.result()]

        # Exclude everything the user has ever listened to (not just the
        # seed set) so this stays about new-to-them discovery.
        a_all_played: AResult[list[str]] = (
            await StatsAccess.get_recently_played_songs_async(
                session=session, user_id=user_id, limit=PROFILE_EXCLUDE_LIMIT
            )
        )
        played_ids: list[str] = a_all_played.result() if a_all_played.is_ok() else []
        exclude_public_ids: list[str] = list(
            dict.fromkeys(played_ids + seed_public_ids)
        )

        a_exclude_medias: AResult[list[MediaModel]] = (
            await Media.get_medias_from_public_ids_async(
                session=session,
                public_ids=exclude_public_ids,
                media_type_keys=[MediaTypeEnum.SONG, MediaTypeEnum.VIDEO],
            )
        )
        exclude_ids: list[int] = (
            [m.id for m in a_exclude_medias.result()]
            if a_exclude_medias.is_ok()
            else seed_ids
        )

        a_similar: AResult[list[str]] = (
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

        songs: list[BaseSongWithAlbumResponse] = (
            await Media.resolve_songs_from_public_ids_async(
                session=session, public_ids=a_similar.result()
            )
        )

        top_seed_public_id = next(iter(recent_ids[:1] or liked_ids[:1]), None)
        seed_name, seed_artist = (
            await Recommendation._resolve_seed_track_async(
                session=session, public_id=top_seed_public_id
            )
            if top_seed_public_id
            else ("", "")
        )
        discover: list[BaseSearchResultsItem] = (
            await Recommendation._get_discover_songs_async(
                session=session,
                seed_name=seed_name,
                seed_artist_name=seed_artist,
            )
            if seed_name
            else []
        )

        Recommendation._schedule_auto_downloads(
            user_id=user_id, songs=songs, discover=discover
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

        a_seed_medias: AResult[list[MediaModel]] = (
            await Media.get_medias_from_public_ids_async(
                session=session,
                public_ids=seed_public_ids,
                media_type_keys=[MediaTypeEnum.SONG, MediaTypeEnum.VIDEO],
            )
        )
        if a_seed_medias.is_not_ok():
            logger.error(
                f"Error resolving playlist songs for {playlist_public_id}. "
                f"{a_seed_medias.info()}"
            )
            return AResult(code=a_seed_medias.code(), message=a_seed_medias.message())

        seed_ids: list[int] = [m.id for m in a_seed_medias.result()]

        a_similar: AResult[list[str]] = (
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

        songs: list[BaseSongWithAlbumResponse] = (
            await Media.resolve_songs_from_public_ids_async(
                session=session, public_ids=a_similar.result()
            )
        )

        seed_name, seed_artist = await Recommendation._resolve_seed_track_async(
            session=session, public_id=seed_public_ids[0]
        )
        discover: list[BaseSearchResultsItem] = (
            await Recommendation._get_discover_songs_async(
                session=session,
                seed_name=seed_name,
                seed_artist_name=seed_artist,
            )
            if seed_name
            else []
        )

        Recommendation._schedule_auto_downloads(
            user_id=user_id, songs=songs, discover=discover
        )

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=RecommendationResult(songs=songs, discover=discover),
        )
