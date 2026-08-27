import os
import re
import asyncio
from typing import Dict, List, TYPE_CHECKING

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.utils.backendUtils import time_it
from backend.constants import BACKEND_URL, MEDIA_PATH

from backend.core.aResult import AResult, AResultCode

from backend.core.access.db.ormModels.image import ImageRow

from backend.core.framework.provider.baseMediaProvider import BaseMediaProvider
from backend.core.framework.media.image import Image
from backend.core.framework.downloader.baseDownload import BaseDownload

from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from backend.core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)
from backend.core.responses.searchResponse import (
    BaseSearchResultsItem,
    ArtistSearchResultsItem,
)
from backend.core.responses.basePlaylistWithMediasResponse import (
    BasePlaylistWithMediasResponse,
    PlaylistResponseItem,
)
from backend.core.responses.basePlaylistWithoutMediasResponse import (
    BasePlaylistWithoutMediasResponse,
)

from backend.youtubeMusic.utils.youtubeMusicApi import YoutubeMusicApi
from backend.youtubeMusic.utils.youtubeMusicApi import (
    YoutubeMusicTrack,
    YoutubeMusicAlbum,
    YoutubeMusicArtist,
    YoutubeMusicPlaylist,
    YoutubeMusicPlaylistTrack,
)

from backend.youtubeMusic.access.youtubeMusicAccess import YoutubeMusicAccess

from backend.youtubeMusic.framework.download.imageDownload import ImageDownload
from backend.youtubeMusic.framework.download.youtubeMusicDownload import (
    YoutubeMusicDownload,
)

from backend.youtubeMusic.responses.songResponse import YoutubeMusicTrackResponse
from backend.youtubeMusic.responses.albumResponse import YoutubeMusicAlbumResponse
from backend.youtubeMusic.responses.artistResponse import YoutubeMusicArtistResponse

if TYPE_CHECKING:
    from backend.youtubeMusic.access.db.ormModels.track import TrackRow
    from backend.youtubeMusic.access.db.ormModels.album import AlbumRow
    from backend.youtubeMusic.access.db.ormModels.artist import ArtistRow
    from backend.youtubeMusic.access.db.ormModels.playlist import PlaylistRow

logger = getLogger(__name__)


class YoutubeMusic:
    provider: BaseMediaProvider
    provider_name: str

    @staticmethod
    async def get_provider_id() -> AResult[int]:
        a_result: AResult[int] = YoutubeMusic.provider.get_id()
        if a_result.is_not_ok():
            logger.error(f"Error getting provider id. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())
        return a_result

    @staticmethod
    async def get_or_create_image_async(
        session: AsyncSession,
        url: str,
    ) -> AResult[ImageRow]:
        return await ImageDownload.download_and_create_internal_image_async(
            session=session, url=url
        )

    @staticmethod
    async def download_images_batch_async(
        session: AsyncSession,
        urls: set[str],
    ) -> dict[str, tuple[str, str]]:
        """Download multiple images in parallel.

        Returns a mapping from each URL to (internal_url, dominant_color).
        Falls back to the external URL on failure.
        """

        import asyncio

        downloads = await asyncio.gather(
            *[
                ImageDownload.download_and_create_internal_image_async(
                    session=session, url=url
                )
                for url in urls
            ]
        )

        result: dict[str, tuple[str, str]] = {}
        for url, a_result in zip(urls, downloads):
            if a_result.is_ok():
                image_row = a_result.result()
                result[url] = (
                    Image.get_internal_image_url(image_row),
                    image_row.dominant_color,
                )
            else:
                logger.warning(
                    f"Failed to download image from {url}: {a_result.info()}"
                )
                result[url] = (url, "")
        return result

    @staticmethod
    async def get_or_create_artist_async(
        session: AsyncSession,
        raw: "YoutubeMusicArtist",
        provider_id: int,
    ) -> AResult["ArtistRow"]:
        a_result_img = await ImageDownload.download_and_create_internal_image_async(
            session=session, url=raw.thumbnail_url
        )
        image_id: int
        if a_result_img.is_ok():
            image_id = a_result_img.result().id
        else:
            a_result_image = await Image.get_image_from_path_async(
                session=session, path="artist-placeholder.png"
            )
            if a_result_image.is_ok():
                image_id = a_result_image.result().id
            else:
                logger.error(
                    f"Error getting placeholder image: {a_result_image.info()}"
                )
                return AResult(
                    code=a_result_image.code(), message=a_result_image.message()
                )

        return await YoutubeMusicAccess.get_or_create_artist_with_image_id_async(
            session=session,
            raw=raw,
            provider_id=provider_id,
            image_id=image_id,
        )

    @staticmethod
    async def get_or_create_album_async(
        session: AsyncSession,
        raw: "YoutubeMusicAlbum",
        artist_map: Dict[str, "ArtistRow"],
        provider_id: int,
    ) -> AResult["AlbumRow"]:
        a_result_img = await ImageDownload.download_and_create_internal_image_async(
            session=session, url=raw.thumbnail_url
        )
        if a_result_img.is_not_ok():
            logger.error(f"Error creating image: {a_result_img.info()}")
            return AResult(code=a_result_img.code(), message=a_result_img.message())
        image_id = a_result_img.result().id

        return await YoutubeMusicAccess.get_or_create_album_with_image_id_async(
            session=session,
            raw=raw,
            artist_map=artist_map,
            provider_id=provider_id,
            image_id=image_id,
        )

    @staticmethod
    async def get_or_create_track_async(
        session: AsyncSession,
        raw: "YoutubeMusicTrack",
        artist_map: Dict[str, "ArtistRow"],
        album_row: "AlbumRow",
        provider_id: int,
    ) -> AResult["TrackRow"]:
        a_result_img = await ImageDownload.download_and_create_internal_image_async(
            session=session, url=raw.thumbnail_url
        )
        if a_result_img.is_not_ok():
            logger.error(f"Error creating image: {a_result_img.info()}")
            return AResult(code=a_result_img.code(), message=a_result_img.message())
        image_id = a_result_img.result().id

        return await YoutubeMusicAccess.get_or_create_track_with_image_id_async(
            session=session,
            raw=raw,
            artist_map=artist_map,
            album_row=album_row,
            provider_id=provider_id,
            image_id=image_id,
        )

    @staticmethod
    async def add_track_async(
        session: AsyncSession,
        youtube_id: str,
    ) -> AResult[BaseSongWithAlbumResponse]:
        """Add a track from youtube_id. If not in DB, fetch from API and populate."""
        a_result_db_track = await YoutubeMusicAccess.get_track_by_youtube_id_async(
            session=session, youtube_id=youtube_id
        )

        if a_result_db_track.is_ok():
            db_track = a_result_db_track.result()
            core_media = db_track.core_song
            return await YoutubeMusic._build_track_response(
                session=session, db_track=db_track, public_id=core_media.public_id
            )

        if a_result_db_track.code() != AResultCode.NOT_FOUND:
            logger.error(f"Error getting track from DB. {a_result_db_track.info()}")
            return AResult(
                code=a_result_db_track.code(), message=a_result_db_track.message()
            )

        a_result_track_api = await YoutubeMusicApi.get_track_info_async(
            youtube_id=youtube_id
        )
        if a_result_track_api.is_not_ok():
            logger.error(f"Error getting track from API. {a_result_track_api.info()}")
            return AResult(
                code=a_result_track_api.code(), message=a_result_track_api.message()
            )

        track_api: YoutubeMusicTrack = a_result_track_api.result()

        a_result_album_api: AResult[YoutubeMusicAlbum]
        if track_api.album_youtube_id:
            a_result_album_api = await YoutubeMusicApi.get_album_info_async(
                youtube_id=track_api.album_youtube_id
            )
            if a_result_album_api.is_not_ok():
                logger.error(
                    f"Error getting album from API. {a_result_album_api.info()}"
                )
                return AResult(
                    code=a_result_album_api.code(), message=a_result_album_api.message()
                )
            album_api: YoutubeMusicAlbum = a_result_album_api.result()
        else:
            logger.info(
                f"No album_youtube_id for album '{track_api.album}', creating from track metadata"
            )
            album_api = YoutubeMusicAlbum(
                youtube_id=f"album-{track_api.album}",
                title=track_api.album,
                artists=track_api.artists,
                release_year=track_api.release_year,
                thumbnail_url=track_api.thumbnail_url,
            )

        a_result_provider_id = await YoutubeMusic.get_provider_id()
        if a_result_provider_id.is_not_ok():
            return AResult(
                code=a_result_provider_id.code(), message=a_result_provider_id.message()
            )
        provider_id = a_result_provider_id.result()

        artist_map: Dict[str, ArtistRow] = {}
        for artist_name in track_api.artists:
            artist_api = YoutubeMusicArtist(
                youtube_id=f"artist-{artist_name}",
                name=artist_name,
                thumbnail_url=track_api.thumbnail_url,
            )
            a_result_artist = await YoutubeMusic.get_or_create_artist_async(
                session=session, raw=artist_api, provider_id=provider_id
            )
            if a_result_artist.is_ok():
                artist_map[artist_name] = a_result_artist.result()

        a_result_album = await YoutubeMusic.get_or_create_album_async(
            session=session,
            raw=album_api,
            artist_map=artist_map,
            provider_id=provider_id,
        )
        if a_result_album.is_not_ok():
            return AResult(code=a_result_album.code(), message=a_result_album.message())
        album_row = a_result_album.result()

        a_result_track = await YoutubeMusic.get_or_create_track_async(
            session=session,
            raw=track_api,
            artist_map=artist_map,
            album_row=album_row,
            provider_id=provider_id,
        )
        if a_result_track.is_not_ok():
            return AResult(code=a_result_track.code(), message=a_result_track.message())
        db_track = a_result_track.result()

        core_media = db_track.core_song
        return await YoutubeMusic._build_track_response(
            session=session, db_track=db_track, public_id=core_media.public_id
        )

    @staticmethod
    async def add_album_async(
        session: AsyncSession,
        youtube_id: str,
    ) -> AResult[BaseAlbumWithSongsResponse]:
        """Add an album from youtube_id. If not in DB, fetch from API and populate."""
        a_result_db_album = await YoutubeMusicAccess.get_album_by_youtube_id_async(
            session=session, youtube_id=youtube_id
        )

        if a_result_db_album.is_ok():
            db_album = a_result_db_album.result()
            core_media = db_album.core_album
            return await YoutubeMusic._build_album_response(
                session=session, db_album=db_album, public_id=core_media.public_id
            )

        if a_result_db_album.code() != AResultCode.NOT_FOUND:
            logger.error(f"Error getting album from DB. {a_result_db_album.info()}")
            return AResult(
                code=a_result_db_album.code(), message=a_result_db_album.message()
            )

        a_result_album_api = await YoutubeMusicApi.get_album_info_async(
            youtube_id=youtube_id
        )
        if a_result_album_api.is_not_ok():
            logger.error(f"Error getting album from API. {a_result_album_api.info()}")
            return AResult(
                code=a_result_album_api.code(), message=a_result_album_api.message()
            )

        album_api: YoutubeMusicAlbum = a_result_album_api.result()

        a_result_album_tracks_api = await YoutubeMusicApi.get_album_tracks_async(
            youtube_id=youtube_id
        )
        if a_result_album_tracks_api.is_not_ok():
            logger.error(
                f"Error getting album tracks from API. {a_result_album_tracks_api.info()}"
            )
            return AResult(
                code=a_result_album_tracks_api.code(),
                message=a_result_album_tracks_api.message(),
            )

        tracks_api: List[YoutubeMusicTrack] = a_result_album_tracks_api.result()

        a_result_provider_id = await YoutubeMusic.get_provider_id()
        if a_result_provider_id.is_not_ok():
            return AResult(
                code=a_result_provider_id.code(), message=a_result_provider_id.message()
            )
        provider_id = a_result_provider_id.result()

        artist_map: Dict[str, ArtistRow] = {}
        for artist_name in album_api.artists:
            artist_api = YoutubeMusicArtist(
                youtube_id=f"artist-{artist_name}",
                name=artist_name,
                thumbnail_url=album_api.thumbnail_url,
            )
            a_result_artist = await YoutubeMusic.get_or_create_artist_async(
                session=session, raw=artist_api, provider_id=provider_id
            )
            if a_result_artist.is_ok():
                artist_map[artist_name] = a_result_artist.result()

        a_result_album = await YoutubeMusic.get_or_create_album_async(
            session=session,
            raw=album_api,
            artist_map=artist_map,
            provider_id=provider_id,
        )
        if a_result_album.is_not_ok():
            return AResult(code=a_result_album.code(), message=a_result_album.message())
        album_row = a_result_album.result()

        for track_api in tracks_api:
            await YoutubeMusic.get_or_create_track_async(
                session=session,
                raw=track_api,
                artist_map=artist_map,
                album_row=album_row,
                provider_id=provider_id,
            )

        core_media = album_row.core_album
        return await YoutubeMusic._build_album_response(
            session=session, db_album=album_row, public_id=core_media.public_id
        )

    @staticmethod
    async def add_artist_async(
        session: AsyncSession,
        youtube_id: str,
    ) -> AResult[BaseArtistResponse]:
        """Add an artist from youtube_id. If not in DB, fetch from API and populate."""
        a_result_db_artist = await YoutubeMusicAccess.get_artist_by_youtube_id_async(
            session=session, youtube_id=youtube_id
        )

        if a_result_db_artist.is_ok():
            db_artist = a_result_db_artist.result()
            core_media = db_artist.core_artist
            return await YoutubeMusic._build_artist_response(
                session=session, db_artist=db_artist, public_id=core_media.public_id
            )

        if a_result_db_artist.code() != AResultCode.NOT_FOUND:
            logger.error(f"Error getting artist from DB. {a_result_db_artist.info()}")
            return AResult(
                code=a_result_db_artist.code(), message=a_result_db_artist.message()
            )

        a_result_artist_api = await YoutubeMusicApi.get_artist_info_async(
            youtube_id=youtube_id
        )
        if a_result_artist_api.is_not_ok():
            logger.error(f"Error getting artist from API. {a_result_artist_api.info()}")
            return AResult(
                code=a_result_artist_api.code(), message=a_result_artist_api.message()
            )

        artist_api: YoutubeMusicArtist = a_result_artist_api.result()

        a_result_artist_top_songs_api = (
            await YoutubeMusicApi.get_artist_top_songs_async(youtube_id=youtube_id)
        )
        if a_result_artist_top_songs_api.is_not_ok():
            logger.error(
                f"Error getting artist top songs from API. {a_result_artist_top_songs_api.info()}"
            )

        tracks_api: List[YoutubeMusicTrack] = (
            a_result_artist_top_songs_api.result()
            if a_result_artist_top_songs_api.is_ok()
            else []
        )

        a_result_provider_id = await YoutubeMusic.get_provider_id()
        if a_result_provider_id.is_not_ok():
            return AResult(
                code=a_result_provider_id.code(), message=a_result_provider_id.message()
            )
        provider_id = a_result_provider_id.result()

        a_result_artist = await YoutubeMusic.get_or_create_artist_async(
            session=session, raw=artist_api, provider_id=provider_id
        )
        if a_result_artist.is_not_ok():
            return AResult(
                code=a_result_artist.code(), message=a_result_artist.message()
            )
        artist_row = a_result_artist.result()

        album_artist_map: Dict[str, AlbumRow] = {}
        for track_api in tracks_api:
            album_api = YoutubeMusicAlbum(
                youtube_id=f"album-{track_api.album}",
                title=track_api.album,
                artists=track_api.artists,
                release_year=None,
                thumbnail_url=track_api.thumbnail_url,
            )
            a_result_album = await YoutubeMusic.get_or_create_album_async(
                session=session,
                raw=album_api,
                artist_map={},
                provider_id=provider_id,
            )
            if a_result_album.is_ok():
                album_artist_map[track_api.album] = a_result_album.result()

        for track_api in tracks_api:
            album_row = album_artist_map.get(track_api.album)
            if not album_row:
                continue
            await YoutubeMusic.get_or_create_track_async(
                session=session,
                raw=track_api,
                artist_map={artist_row.name: artist_row},
                album_row=album_row,
                provider_id=provider_id,
            )

        core_media = artist_row.core_artist
        return await YoutubeMusic._build_artist_response(
            session=session, db_artist=artist_row, public_id=core_media.public_id
        )

    @staticmethod
    @time_it
    async def get_track_async(
        session: AsyncSession,
        public_id: str,
    ) -> AResult[BaseSongWithAlbumResponse]:
        try:
            a_result_db_track = await YoutubeMusicAccess.get_track_by_public_id_async(
                session=session, public_id=public_id
            )
            if a_result_db_track.is_not_ok():
                logger.error(f"Error getting track from DB. {a_result_db_track.info()}")
                return AResult(
                    code=a_result_db_track.code(),
                    message=a_result_db_track.message(),
                )

            db_track = a_result_db_track.result()

            artists = await YoutubeMusicAccess.get_artists_from_track_async(
                session=session, track=db_track
            )

            artists_list: List[BaseArtistResponse] = []
            if artists.is_ok():
                for artist in artists.result():
                    core_artist = artist.core_artist
                    artists_list.append(
                        BaseArtistResponse(
                            provider=YoutubeMusic.provider_name,
                            publicId=core_artist.public_id,
                            url=f"/artist/{core_artist.public_id}",
                            providerUrl=f"https://music.youtube.com/channel/{artist.youtube_id}",
                            name=artist.name,
                            imageUrl=Image.get_internal_image_url(artist.image),
                            dominantColor=artist.image.dominant_color,
                        )
                    )

            image_url = Image.get_internal_image_url(db_track.image)
            dominant_color = db_track.image.dominant_color

            is_downloaded = db_track.path is not None
            audio_src = (
                f"{BACKEND_URL}/youtube-music/audio/{public_id}"
                if is_downloaded
                else None
            )

            album_data = BaseAlbumWithoutSongsResponse(
                provider=YoutubeMusic.provider_name,
                publicId=db_track.album.core_album.public_id,
                url=f"/album/{db_track.album.core_album.public_id}",
                providerUrl=f"https://music.youtube.com/browse/{db_track.album.youtube_id}",
                name=db_track.album.title,
                artists=[],
                releaseDate=db_track.album.release_date,
                imageUrl=image_url,
                dominantColor=dominant_color,
            )

            response = YoutubeMusicTrackResponse(
                provider=YoutubeMusic.provider_name,
                youtubeId=db_track.youtube_id,
                publicId=public_id,
                providerUrl=f"https://music.youtube.com/watch?v={db_track.youtube_id}",
                name=db_track.title,
                duration_ms=db_track.duration_ms,
                trackNumber=db_track.track_number,
                discNumber=db_track.disc_number,
                imageUrl=image_url,
                audioUrl=audio_src,
                downloaded=is_downloaded,
                artists=artists_list,
                album=album_data,
                dominantColor=dominant_color,
            )

            return AResult(code=AResultCode.OK, message="OK", result=response)

        except Exception as e:
            logger.error(f"Failed to get track: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get track: {e}",
            )

    @staticmethod
    @time_it
    async def get_album_async(
        session: AsyncSession,
        public_id: str,
    ) -> AResult[BaseAlbumWithSongsResponse]:
        try:
            a_result_youtube_id = (
                await YoutubeMusicAccess.get_album_youtube_id_from_public_id_async(
                    session=session, public_id=public_id
                )
            )
            if a_result_youtube_id.is_not_ok():
                logger.error(f"Error getting youtube_id. {a_result_youtube_id.info()}")
                return AResult(
                    code=a_result_youtube_id.code(),
                    message=a_result_youtube_id.message(),
                )

            youtube_id = a_result_youtube_id.result()

            # Check database FIRST before calling API
            a_result_db_album = await YoutubeMusicAccess.get_album_by_youtube_id_async(
                session=session, youtube_id=youtube_id
            )
            if a_result_db_album.is_ok():
                # Album found in DB - build response from DB without calling API
                db_album = a_result_db_album.result()
                return await YoutubeMusic._build_album_response(
                    session=session, db_album=db_album, public_id=public_id
                )

            if a_result_db_album.code() != AResultCode.NOT_FOUND:
                logger.error(f"Error getting album from DB. {a_result_db_album.info()}")
                return AResult(
                    code=a_result_db_album.code(),
                    message=a_result_db_album.message(),
                )

            # Album not in DB - use add_album_async which fetches from API and saves to DB
            return await YoutubeMusic.add_album_async(
                session=session, youtube_id=youtube_id
            )

        except Exception as e:
            logger.error(f"Failed to get album: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get album: {e}",
            )

    @staticmethod
    async def get_artist_async(
        session: AsyncSession,
        public_id: str,
    ) -> AResult[BaseArtistResponse]:
        try:
            a_result_youtube_id = (
                await YoutubeMusicAccess.get_artist_youtube_id_from_public_id_async(
                    session=session, public_id=public_id
                )
            )
            if a_result_youtube_id.is_not_ok():
                logger.error(f"Error getting youtube_id. {a_result_youtube_id.info()}")
                return AResult(
                    code=a_result_youtube_id.code(),
                    message=a_result_youtube_id.message(),
                )

            youtube_id = a_result_youtube_id.result()

            # Check database FIRST before calling API
            a_result_db_artist = (
                await YoutubeMusicAccess.get_artist_by_youtube_id_async(
                    session=session, youtube_id=youtube_id
                )
            )
            if a_result_db_artist.is_ok():
                # Artist found in DB - build response from DB without calling API
                db_artist = a_result_db_artist.result()
                return await YoutubeMusic._build_artist_response(
                    session=session, db_artist=db_artist, public_id=public_id
                )

            if a_result_db_artist.code() != AResultCode.NOT_FOUND:
                logger.error(
                    f"Error getting artist from DB. {a_result_db_artist.info()}"
                )
                return AResult(
                    code=a_result_db_artist.code(),
                    message=a_result_db_artist.message(),
                )

            # Artist not in DB - use add_artist_async which fetches from API and saves to DB
            return await YoutubeMusic.add_artist_async(
                session=session, youtube_id=youtube_id
            )

        except Exception as e:
            logger.error(f"Failed to get artist: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get artist: {e}",
            )

    @staticmethod
    @time_it
    async def search_media_async(
        session: AsyncSession, query: str
    ) -> AResult[List[BaseSearchResultsItem]]:
        """Search YouTube Music and return songs, artists, albums and playlists."""

        (
            a_tracks,
            a_artists,
            a_albums,
            a_playlists,
        ) = await asyncio.gather(
            YoutubeMusicApi.search_track_async(query=query, max_results=15),
            YoutubeMusicApi.search_artists_async(query=query, max_results=15),
            YoutubeMusicApi.search_albums_async(query=query, max_results=15),
            YoutubeMusicApi.search_playlists_async(query=query, max_results=15),
        )

        result: List[BaseSearchResultsItem] = []

        if a_tracks.is_ok():
            tracks = a_tracks.result()
            downloaded_a: AResult[set[str]] = (
                await YoutubeMusicAccess.get_downloaded_youtube_ids_async(
                    session=session,
                    youtube_ids=[t.youtube_id for t in tracks],
                )
            )
            if downloaded_a.is_not_ok():
                logger.error(
                    f"Error getting downloaded YouTube IDs. {downloaded_a.info()}"
                )
                downloaded_ids: set[str] = set()
            else:
                downloaded_ids: set[str] = downloaded_a.result()
            for track in tracks:
                result.append(
                    BaseSearchResultsItem(
                        type="song",
                        name=track.title,
                        providerUrl=f"https://music.youtube.com/watch?v={track.youtube_id}",
                        imageUrl=track.thumbnail_url,
                        artists=[
                            ArtistSearchResultsItem(name=name, url="")
                            for name in track.artists
                        ],
                        provider=YoutubeMusic.provider_name,
                        downloaded=track.youtube_id in downloaded_ids,
                        url=None,
                    )
                )

        else:
            logger.error(f"YouTube Music track search error: {a_tracks.info()}")

        if a_artists.is_ok():
            artists_result = a_artists.result()
            artist_a: AResult[dict[str, str]] = (
                await YoutubeMusicAccess.get_artist_public_ids_by_youtube_ids_async(
                    session=session,
                    youtube_ids=[a.youtube_id for a in artists_result],
                )
            )
            if artist_a.is_not_ok():
                logger.error(f"Error getting artist public IDs. {artist_a.info()}")
                artist_public_ids: dict[str, str] = {}
            else:
                artist_public_ids: dict[str, str] = artist_a.result()
            for artist in artists_result:
                result.append(
                    BaseSearchResultsItem(
                        type="artist",
                        name=artist.name,
                        providerUrl=f"https://music.youtube.com/channel/{artist.youtube_id}",
                        imageUrl=artist.thumbnail_url,
                        artists=[],
                        provider=YoutubeMusic.provider_name,
                        downloaded=None,
                        url=(
                            f"/artist/{artist_public_ids[artist.youtube_id]}"
                            if artist.youtube_id in artist_public_ids
                            else None
                        ),
                    )
                )
        else:
            logger.error(f"YouTube Music artist search error: {a_artists.info()}")

        if a_albums.is_ok():
            albums_result = a_albums.result()
            album_a: AResult[dict[str, str]] = (
                await YoutubeMusicAccess.get_album_public_ids_by_youtube_ids_async(
                    session=session,
                    youtube_ids=[al.youtube_id for al in albums_result],
                )
            )
            if album_a.is_not_ok():
                logger.error(f"Error getting album public IDs. {album_a.info()}")
                album_public_ids: dict[str, str] = {}
            else:
                album_public_ids: dict[str, str] = album_a.result()
            for album in albums_result:
                result.append(
                    BaseSearchResultsItem(
                        type="album",
                        name=album.title,
                        providerUrl=f"https://music.youtube.com/browse/{album.youtube_id}",
                        imageUrl=album.thumbnail_url,
                        artists=[
                            ArtistSearchResultsItem(name=name, url="")
                            for name in album.artists
                        ],
                        provider=YoutubeMusic.provider_name,
                        downloaded=None,
                        url=(
                            f"/album/{album_public_ids[album.youtube_id]}"
                            if album.youtube_id in album_public_ids
                            else None
                        ),
                    )
                )
        else:
            logger.error(f"YouTube Music album search error: {a_albums.info()}")

        if a_playlists.is_ok():
            playlists_result = a_playlists.result()
            playlist_a: AResult[dict[str, str]] = (
                await YoutubeMusicAccess.get_playlist_public_ids_by_youtube_ids_async(
                    session=session,
                    youtube_ids=[p.youtube_id for p in playlists_result],
                )
            )
            if playlist_a.is_not_ok():
                logger.error(f"Error getting playlist public IDs. {playlist_a.info()}")
                playlist_public_ids: dict[str, str] = {}
            else:
                playlist_public_ids: dict[str, str] = playlist_a.result()
            for playlist in playlists_result:
                result.append(
                    BaseSearchResultsItem(
                        type="playlist",
                        name=playlist.title,
                        providerUrl=f"https://music.youtube.com/browse/{playlist.youtube_id}",
                        imageUrl=playlist.thumbnail_url,
                        artists=(
                            [ArtistSearchResultsItem(name=playlist.author, url="")]
                            if playlist.author
                            else []
                        ),
                        provider=YoutubeMusic.provider_name,
                        downloaded=None,
                        url=(
                            f"/playlist/{playlist_public_ids[playlist.youtube_id]}"
                            if playlist.youtube_id in playlist_public_ids
                            else None
                        ),
                    )
                )
        else:
            logger.error(f"YouTube Music playlist search error: {a_playlists.info()}")

        if not result:
            return AResult(code=AResultCode.NOT_FOUND, message="No results found")

        return AResult(code=AResultCode.OK, message="OK", result=result)

    @staticmethod
    @time_it
    async def get_artists_async(
        session: AsyncSession,
        public_ids: List[str],
    ) -> AResult[List[BaseArtistResponse]]:
        """Get YouTube Music artists by public_ids."""

        results: List[BaseArtistResponse] = []
        for public_id in public_ids:
            a_result: AResult[BaseArtistResponse] = await YoutubeMusic.get_artist_async(
                session=session, public_id=public_id
            )
            if a_result.is_not_ok():
                logger.error(f"Error getting YouTube Music artist. {a_result.info()}")
                continue

            results.append(a_result.result())

        return AResult(code=AResultCode.OK, message="OK", result=results)

    @staticmethod
    async def _get_or_create_playlist_track_async(
        session: AsyncSession,
        raw_track: "YoutubeMusicPlaylistTrack",
        provider_id: int,
    ) -> AResult["TrackRow"]:
        """Persist a single playlist track (with synthesized album/artists) if missing."""

        a_result_existing = await YoutubeMusicAccess.get_track_by_youtube_id_async(
            session=session, youtube_id=raw_track.youtube_id
        )
        if a_result_existing.is_ok():
            return a_result_existing

        if a_result_existing.code() != AResultCode.NOT_FOUND:
            logger.error(f"Error getting track from DB. {a_result_existing.info()}")
            return AResult(
                code=a_result_existing.code(), message=a_result_existing.message()
            )

        artist_map: Dict[str, ArtistRow] = {}
        for artist_name in raw_track.artists:
            artist_api = YoutubeMusicArtist(
                youtube_id=f"artist-{artist_name}",
                name=artist_name,
                thumbnail_url=raw_track.thumbnail_url,
            )
            a_result_artist = await YoutubeMusic.get_or_create_artist_async(
                session=session, raw=artist_api, provider_id=provider_id
            )
            if a_result_artist.is_ok():
                artist_map[artist_name] = a_result_artist.result()

        album_api = YoutubeMusicAlbum(
            youtube_id=f"album-{raw_track.album}",
            title=raw_track.album,
            artists=raw_track.artists,
            release_year=None,
            thumbnail_url=raw_track.thumbnail_url,
        )
        a_result_album = await YoutubeMusic.get_or_create_album_async(
            session=session,
            raw=album_api,
            artist_map=artist_map,
            provider_id=provider_id,
        )
        if a_result_album.is_not_ok():
            return AResult(code=a_result_album.code(), message=a_result_album.message())
        album_row = a_result_album.result()

        track_api = YoutubeMusicTrack(
            youtube_id=raw_track.youtube_id,
            title=raw_track.title,
            artists=raw_track.artists,
            album=raw_track.album,
            album_youtube_id=None,
            duration_ms=raw_track.duration_ms,
            thumbnail_url=raw_track.thumbnail_url,
        )
        return await YoutubeMusic.get_or_create_track_async(
            session=session,
            raw=track_api,
            artist_map=artist_map,
            album_row=album_row,
            provider_id=provider_id,
        )

    @staticmethod
    async def _persist_playlist_async(
        session: AsyncSession,
        youtube_id: str,
    ) -> AResult["PlaylistRow"]:
        """Return the playlist row from DB, fetching from the API and persisting it if missing."""

        a_result_db = await YoutubeMusicAccess.get_playlist_by_youtube_id_async(
            session=session, youtube_id=youtube_id
        )
        if a_result_db.is_ok():
            return a_result_db

        if a_result_db.code() != AResultCode.NOT_FOUND:
            logger.error(f"Error getting playlist from DB. {a_result_db.info()}")
            return AResult(code=a_result_db.code(), message=a_result_db.message())

        a_result_api = await YoutubeMusicApi.get_playlist_info_async(
            playlist_id=youtube_id
        )
        if a_result_api.is_not_ok():
            logger.error(f"Error getting playlist from API. {a_result_api.info()}")
            return AResult(code=a_result_api.code(), message=a_result_api.message())

        raw_playlist: YoutubeMusicPlaylist = a_result_api.result()

        a_result_provider_id = await YoutubeMusic.get_provider_id()
        if a_result_provider_id.is_not_ok():
            return AResult(
                code=a_result_provider_id.code(),
                message=a_result_provider_id.message(),
            )
        provider_id = a_result_provider_id.result()

        track_row_map: Dict[str, "TrackRow"] = {}
        for raw_track in raw_playlist.tracks:
            a_result_track = await YoutubeMusic._get_or_create_playlist_track_async(
                session=session, raw_track=raw_track, provider_id=provider_id
            )
            if a_result_track.is_ok():
                track_row_map[raw_track.youtube_id] = a_result_track.result()

        playlist_image_id: int | None = None
        if raw_playlist.thumbnail_url:
            a_result_img = await YoutubeMusic.get_or_create_image_async(
                session=session, url=raw_playlist.thumbnail_url
            )
            if a_result_img.is_ok():
                playlist_image_id = a_result_img.result().id

        a_result_created = (
            await YoutubeMusicAccess.get_or_create_playlist_with_image_id_async(
                session=session,
                raw=raw_playlist,
                track_row_map=track_row_map,
                provider_id=provider_id,
                image_id=playlist_image_id,
            )
        )
        if a_result_created.is_not_ok():
            logger.error(f"Error persisting playlist. {a_result_created.info()}")
            return AResult(
                code=a_result_created.code(), message=a_result_created.message()
            )

        # Re-fetch from DB so relationships are eagerly loaded for response building.
        return await YoutubeMusicAccess.get_playlist_by_youtube_id_async(
            session=session, youtube_id=youtube_id
        )

    @staticmethod
    async def add_playlist_async(
        session: AsyncSession,
        youtube_id: str,
    ) -> AResult[BasePlaylistWithMediasResponse]:
        """Add a playlist from youtube_id. If not in DB, fetch from API and populate."""

        a_result_playlist = await YoutubeMusic._persist_playlist_async(
            session=session, youtube_id=youtube_id
        )
        if a_result_playlist.is_not_ok():
            return AResult(
                code=a_result_playlist.code(), message=a_result_playlist.message()
            )

        return await YoutubeMusic._build_playlist_with_medias_response(
            session=session, playlist_row=a_result_playlist.result()
        )

    @staticmethod
    async def get_playlists_from_db(
        session: AsyncSession,
        youtube_ids: List[str],
    ) -> AResult[List["PlaylistRow"]]:
        """Get playlists from the database by their youtube_ids."""

        return await YoutubeMusicAccess.get_playlists_by_youtube_ids_async(
            session=session, youtube_ids=youtube_ids
        )

    @staticmethod
    async def get_playlists_async(
        session: AsyncSession,
        youtube_ids: List[str],
    ) -> AResult[List["PlaylistRow"]]:
        """Ensure each playlist is persisted (DB-first, API only if missing) and return rows."""

        if not youtube_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        a_result_existing = await YoutubeMusic.get_playlists_from_db(
            session=session, youtube_ids=youtube_ids
        )
        existing_playlists: List[PlaylistRow] = (
            a_result_existing.result() if a_result_existing.is_ok() else []
        )
        existing_ids: set[str] = {p.youtube_id for p in existing_playlists}
        missing_ids: List[str] = [yid for yid in youtube_ids if yid not in existing_ids]

        for youtube_id in missing_ids:
            a_result_persist = await YoutubeMusic._persist_playlist_async(
                session=session, youtube_id=youtube_id
            )
            if a_result_persist.is_not_ok():
                logger.error(
                    f"Error persisting playlist {youtube_id}. {a_result_persist.info()}"
                )

        if not missing_ids:
            return a_result_existing

        return await YoutubeMusic.get_playlists_from_db(
            session=session, youtube_ids=youtube_ids
        )

    @staticmethod
    @time_it
    async def get_playlists_with_medias_async(
        session: AsyncSession,
        user_id: int,
        public_ids: List[str],
    ) -> AResult[List[BasePlaylistWithMediasResponse]]:
        """Get YouTube Music playlists (with medias) by public_ids, from DB."""

        if not public_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        a_result_mapping = (
            await YoutubeMusicAccess.get_playlists_youtube_id_from_public_ids_async(
                session=session, public_ids=public_ids
            )
        )
        if a_result_mapping.is_not_ok():
            return AResult(
                code=a_result_mapping.code(), message=a_result_mapping.message()
            )

        public_id_to_youtube_id: Dict[str, str] = a_result_mapping.result()
        youtube_ids = list(public_id_to_youtube_id.values())
        if not youtube_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        a_result_playlists = await YoutubeMusic.get_playlists_async(
            session=session, youtube_ids=youtube_ids
        )
        if a_result_playlists.is_not_ok():
            return AResult(
                code=a_result_playlists.code(), message=a_result_playlists.message()
            )

        playlist_by_public_id: Dict[str, BasePlaylistWithMediasResponse] = {}
        for playlist_row in a_result_playlists.result():
            a_result = await YoutubeMusic._build_playlist_with_medias_response(
                session=session, playlist_row=playlist_row
            )
            if a_result.is_ok():
                playlist_by_public_id[a_result.result().publicId] = a_result.result()

        ordered: List[BasePlaylistWithMediasResponse] = [
            playlist_by_public_id[pid]
            for pid in public_ids
            if pid in playlist_by_public_id
        ]
        return AResult(code=AResultCode.OK, message="OK", result=ordered)

    @staticmethod
    @time_it
    async def get_playlists_without_medias_async(
        session: AsyncSession,
        user_id: int,
        public_ids: List[str],
    ) -> AResult[List[BasePlaylistWithoutMediasResponse]]:
        """Get YouTube Music playlists (without medias) by public_ids, from DB."""

        if not public_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        a_result_mapping = (
            await YoutubeMusicAccess.get_playlists_youtube_id_from_public_ids_async(
                session=session, public_ids=public_ids
            )
        )
        if a_result_mapping.is_not_ok():
            return AResult(
                code=a_result_mapping.code(), message=a_result_mapping.message()
            )

        public_id_to_youtube_id: Dict[str, str] = a_result_mapping.result()
        youtube_ids = list(public_id_to_youtube_id.values())
        if not youtube_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        a_result_playlists = await YoutubeMusic.get_playlists_async(
            session=session, youtube_ids=youtube_ids
        )
        if a_result_playlists.is_not_ok():
            return AResult(
                code=a_result_playlists.code(), message=a_result_playlists.message()
            )

        playlist_by_public_id: Dict[str, BasePlaylistWithoutMediasResponse] = {}
        for playlist_row in a_result_playlists.result():
            a_result = await YoutubeMusic._build_playlist_without_medias_response(
                session=session, playlist_row=playlist_row
            )
            if a_result.is_ok():
                playlist_by_public_id[a_result.result().publicId] = a_result.result()

        ordered: List[BasePlaylistWithoutMediasResponse] = [
            playlist_by_public_id[pid]
            for pid in public_ids
            if pid in playlist_by_public_id
        ]
        return AResult(code=AResultCode.OK, message="OK", result=ordered)

    @staticmethod
    async def _build_playlist_with_medias_response(
        session: AsyncSession,
        playlist_row: "PlaylistRow",
    ) -> AResult[BasePlaylistWithMediasResponse]:
        """Build a playlist-with-medias response from the database only."""

        a_result_links = await YoutubeMusicAccess.get_playlist_track_links_async(
            session=session, playlist_id=playlist_row.id
        )
        track_links = a_result_links.result() if a_result_links.is_ok() else []

        song_responses: List[PlaylistResponseItem[BaseSongWithAlbumResponse]] = []
        for link in track_links:
            a_result_track = await YoutubeMusic._build_track_response(
                session=session,
                db_track=link.track,
                public_id=link.track.core_song.public_id,
            )
            if a_result_track.is_not_ok():
                logger.error(
                    f"Error building playlist track response. {a_result_track.info()}"
                )
                continue

            track: BaseSongWithAlbumResponse = a_result_track.result()
            song_responses.append(
                PlaylistResponseItem(
                    item=BaseSongWithAlbumResponse(
                        provider=track.provider,
                        publicId=track.publicId,
                        providerUrl=track.providerUrl,
                        name=track.name,
                        artists=list(track.artists),
                        audioUrl=track.audioUrl,
                        downloaded=track.downloaded,
                        imageUrl=track.imageUrl,
                        dominantColor=track.dominantColor,
                        duration_ms=track.duration_ms,
                        discNumber=track.discNumber,
                        trackNumber=track.trackNumber,
                        album=track.album,
                    ),
                    addedAt=link.playlist_track.added_at,
                )
            )

        public_id = playlist_row.core_playlist.public_id
        image_url = (
            Image.get_internal_image_url(playlist_row.image)
            if playlist_row.image
            else ""
        )

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=BasePlaylistWithMediasResponse(
                type="playlist",
                description=playlist_row.description or "",
                provider=YoutubeMusic.provider_name,
                publicId=public_id,
                url=f"/playlist/{public_id}",
                providerUrl=f"https://music.youtube.com/playlist?list={playlist_row.youtube_id}",
                name=playlist_row.name,
                medias=song_responses,
                contributors=[],
                imageUrl=image_url,
                owner=BaseArtistResponse(
                    provider=YoutubeMusic.provider_name,
                    publicId="",
                    url="",
                    providerUrl="",
                    name=playlist_row.owner,
                    imageUrl="",
                    dominantColor="",
                ),
            ),
        )

    @staticmethod
    async def _build_playlist_without_medias_response(
        session: AsyncSession,
        playlist_row: "PlaylistRow",
    ) -> AResult[BasePlaylistWithoutMediasResponse]:
        """Build a playlist-without-medias response from the database only."""

        public_id = playlist_row.core_playlist.public_id
        image_url = (
            Image.get_internal_image_url(playlist_row.image)
            if playlist_row.image
            else ""
        )

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=BasePlaylistWithoutMediasResponse(
                type="playlist",
                description=playlist_row.description or "",
                provider=YoutubeMusic.provider_name,
                publicId=public_id,
                url=f"/playlist/{public_id}",
                providerUrl=f"https://music.youtube.com/playlist?list={playlist_row.youtube_id}",
                name=playlist_row.name,
                contributors=[],
                imageUrl=image_url,
                owner=BaseArtistResponse(
                    provider=YoutubeMusic.provider_name,
                    publicId="",
                    url="",
                    providerUrl="",
                    name=playlist_row.owner,
                    imageUrl="",
                    dominantColor="",
                ),
            ),
        )

    @staticmethod
    async def start_download_async(
        session: AsyncSession,
        public_id: str,
        download_id: int,
        download_group_id: int,
        user_id: int,
    ) -> AResult[BaseDownload]:
        """Create a YoutubeMusicDownload for the given track public_id."""

        a_result: AResult[str] = (
            await YoutubeMusicAccess.get_track_youtube_id_from_public_id_async(
                session=session, public_id=public_id
            )
        )
        if a_result.is_not_ok():
            logger.error(
                f"Error getting youtube_id for public_id {public_id}: {a_result.message()}"
            )
            return AResult(code=a_result.code(), message=a_result.message())

        youtube_id: str = a_result.result()

        a_result_track = await YoutubeMusicAccess.get_track_by_youtube_id_async(
            session=session, youtube_id=youtube_id
        )
        if a_result_track.is_not_ok():
            logger.error(
                f"Error getting track row for youtube_id {youtube_id}: {a_result_track.message()}"
            )
            return AResult(code=a_result_track.code(), message=a_result_track.message())

        track = a_result_track.result()

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=YoutubeMusicDownload(
                public_id=public_id,
                download_id=download_id,
                download_group_id=download_group_id,
                user_id=user_id,
                track_id=track.id,
                youtube_id=youtube_id,
                download_url=track.download_url,
            ),
        )

    @staticmethod
    async def get_media_duration_ms_async(
        session: AsyncSession, public_id: str
    ) -> AResult[int]:
        """Get the duration of a YouTube Music track in milliseconds."""

        a_result: AResult[str] = (
            await YoutubeMusicAccess.get_track_youtube_id_from_public_id_async(
                session=session, public_id=public_id
            )
        )
        if a_result.is_not_ok():
            return AResult(code=a_result.code(), message=a_result.message())

        youtube_id: str = a_result.result()

        a_result_track = await YoutubeMusicAccess.get_track_by_youtube_id_async(
            session=session, youtube_id=youtube_id
        )
        if a_result_track.is_not_ok():
            return AResult(code=a_result_track.code(), message=a_result_track.message())

        track = a_result_track.result()
        duration_ms = track.duration_ms or 0

        return AResult(code=AResultCode.OK, message="OK", result=duration_ms)

    @staticmethod
    async def delete_media_async(session: AsyncSession, public_id: str) -> AResultCode:
        """Remove the media file for a YouTube Music track and reset its path in the database."""

        a_result_track = await YoutubeMusicAccess.get_track_by_public_id_async(
            session=session, public_id=public_id
        )
        if a_result_track.is_not_ok():
            logger.error(
                f"Error getting track for public id {public_id}. {a_result_track.info()}"
            )
            return AResultCode(
                code=a_result_track.code(), message=a_result_track.message()
            )

        track = a_result_track.result()

        if track.path:
            full_path: str = os.path.join(MEDIA_PATH, track.path)
            YoutubeMusic._rename_file_to_backup(file_path=full_path)

        a_result_clear: AResultCode = await YoutubeMusicAccess.update_track_path_async(
            session=session, track_id=track.id, path=None
        )
        if a_result_clear.is_not_ok():
            logger.error(f"Error clearing track path. {a_result_clear.info()}")
            return AResultCode(
                code=a_result_clear.code(), message=a_result_clear.message()
            )

        return AResultCode(code=AResultCode.OK, message="OK")

    @staticmethod
    def _rename_file_to_backup(file_path: str) -> None:
        """Rename a file by appending .bak<n> where n is the next available number.

        If the file does not exist, this is a no-op.
        """

        if not os.path.exists(file_path):
            return

        n: int = 1
        while os.path.exists(f"{file_path}.bak{n}"):
            n += 1

        os.rename(file_path, f"{file_path}.bak{n}")

    @staticmethod
    async def _build_track_response(
        session: AsyncSession,
        db_track: "TrackRow",
        public_id: str,
    ) -> AResult[BaseSongWithAlbumResponse]:
        # Build response from database only - no API call needed
        artists = await YoutubeMusicAccess.get_artists_from_track_async(
            session=session, track=db_track
        )

        artists_list: List[BaseArtistResponse] = []
        if artists.is_ok():
            for artist in artists.result():
                core_artist = artist.core_artist
                artists_list.append(
                    BaseArtistResponse(
                        provider=YoutubeMusic.provider_name,
                        publicId=core_artist.public_id,
                        url=f"/artist/{core_artist.public_id}",
                        providerUrl=f"https://music.youtube.com/channel/{artist.youtube_id}",
                        name=artist.name,
                        imageUrl=Image.get_internal_image_url(artist.image),
                        dominantColor=artist.image.dominant_color,
                    )
                )

        image_url = Image.get_internal_image_url(db_track.image)
        dominant_color = db_track.image.dominant_color

        is_downloaded = db_track.path is not None
        audio_src = (
            f"{BACKEND_URL}/youtube-music/audio/{public_id}" if is_downloaded else None
        )

        album_data = BaseAlbumWithoutSongsResponse(
            provider=YoutubeMusic.provider_name,
            publicId=db_track.album.core_album.public_id,
            url=f"/album/{db_track.album.core_album.public_id}",
            providerUrl=f"https://music.youtube.com/browse/{db_track.album.youtube_id}",
            name=db_track.album.title,
            artists=[],
            releaseDate=db_track.album.release_date,
            imageUrl=image_url,
            dominantColor=dominant_color,
        )

        response = YoutubeMusicTrackResponse(
            provider=YoutubeMusic.provider_name,
            publicId=public_id,
            providerUrl=f"https://music.youtube.com/watch?v={db_track.youtube_id}",
            name=db_track.title,
            duration_ms=db_track.duration_ms,
            trackNumber=db_track.track_number,
            discNumber=db_track.disc_number,
            imageUrl=image_url,
            audioUrl=audio_src,
            downloaded=is_downloaded,
            artists=artists_list,
            album=album_data,
            youtubeId=db_track.youtube_id,
            dominantColor=dominant_color,
        )

        return AResult(code=AResultCode.OK, message="OK", result=response)

    @staticmethod
    async def _build_album_response(
        session: AsyncSession,
        db_album: "AlbumRow",
        public_id: str,
    ) -> AResult[BaseAlbumWithSongsResponse]:
        # Build response from database only - no API call needed
        a_result_artists = await YoutubeMusicAccess.get_artists_from_album_async(
            session=session, album=db_album
        )
        artists_list: List[BaseArtistResponse] = []
        if a_result_artists.is_ok():
            for artist in a_result_artists.result():
                core_artist = artist.core_artist
                artists_list.append(
                    BaseArtistResponse(
                        provider=YoutubeMusic.provider_name,
                        publicId=core_artist.public_id,
                        url=f"/artist/{core_artist.public_id}",
                        providerUrl=f"https://music.youtube.com/channel/{artist.youtube_id}",
                        name=artist.name,
                        imageUrl=Image.get_internal_image_url(artist.image),
                        dominantColor=artist.image.dominant_color,
                    )
                )

        a_result_tracks = await YoutubeMusicAccess.get_tracks_from_album_id_async(
            session=session, album_id=db_album.id
        )
        songs_list: List[YoutubeMusicTrackResponse] = []
        if a_result_tracks.is_ok():
            for track in a_result_tracks.result():
                core_track = track.core_song
                track_artists = await YoutubeMusicAccess.get_artists_from_track_async(
                    session=session, track=track
                )
                track_artists_list: List[BaseArtistResponse] = []
                if track_artists.is_ok():
                    for artist in track_artists.result():
                        core_artist = artist.core_artist
                        track_artists_list.append(
                            BaseArtistResponse(
                                provider=YoutubeMusic.provider_name,
                                publicId=core_artist.public_id,
                                url=f"/artist/{core_artist.public_id}",
                                providerUrl=f"https://music.youtube.com/channel/{artist.youtube_id}",
                                name=artist.name,
                                imageUrl=Image.get_internal_image_url(artist.image),
                                dominantColor=artist.image.dominant_color,
                            )
                        )

                image_url = Image.get_internal_image_url(track.image)
                track_dominant_color = track.image.dominant_color

                is_downloaded = track.path is not None
                audio_src = (
                    f"{BACKEND_URL}/youtube-music/audio/{core_track.public_id}"
                    if is_downloaded
                    else None
                )

                songs_list.append(
                    YoutubeMusicTrackResponse(
                        provider=YoutubeMusic.provider_name,
                        publicId=core_track.public_id,
                        providerUrl=f"https://music.youtube.com/watch?v={track.youtube_id}",
                        name=track.title,
                        duration_ms=track.duration_ms,
                        trackNumber=track.track_number,
                        discNumber=track.disc_number,
                        imageUrl=image_url,
                        audioUrl=audio_src,
                        downloaded=is_downloaded,
                        artists=track_artists_list,
                        album=BaseAlbumWithoutSongsResponse(
                            provider=YoutubeMusic.provider_name,
                            publicId=public_id,
                            url=f"/album/{public_id}",
                            providerUrl=f"https://music.youtube.com/browse/{db_album.youtube_id}",
                            name=db_album.title,
                            artists=artists_list,
                            releaseDate=db_album.release_date,
                            imageUrl=image_url,
                            dominantColor=track_dominant_color,
                        ),
                        youtubeId=track.youtube_id,
                        dominantColor=track_dominant_color,
                    )
                )

        image_url = Image.get_internal_image_url(db_album.image)
        dominant_color = db_album.image.dominant_color

        response = YoutubeMusicAlbumResponse(
            provider=YoutubeMusic.provider_name,
            publicId=public_id,
            url=f"/album/{public_id}",
            providerUrl=f"https://music.youtube.com/browse/{db_album.youtube_id}",
            name=db_album.title,
            imageUrl=image_url,
            dominantColor=dominant_color,
            artists=artists_list,
            releaseDate=db_album.release_date,
            year=db_album.year,
            songs=songs_list,
            youtubeId=db_album.youtube_id,
        )

        return AResult(code=AResultCode.OK, message="OK", result=response)

    @staticmethod
    async def _build_artist_response(
        session: AsyncSession,
        db_artist: "ArtistRow",
        public_id: str,
    ) -> AResult[BaseArtistResponse]:
        # Build response from database only - no API call needed
        a_result_tracks = await YoutubeMusicAccess.get_tracks_from_artist_id_async(
            session=session, artist_id=db_artist.id
        )
        top_songs: List[YoutubeMusicTrackResponse] = []
        if a_result_tracks.is_ok():
            for track in a_result_tracks.result():
                core_track = track.core_song
                track_artists = await YoutubeMusicAccess.get_artists_from_track_async(
                    session=session, track=track
                )
                track_artists_list: List[BaseArtistResponse] = []
                if track_artists.is_ok():
                    for artist in track_artists.result():
                        core_artist = artist.core_artist
                        track_artists_list.append(
                            BaseArtistResponse(
                                provider=YoutubeMusic.provider_name,
                                publicId=core_artist.public_id,
                                url=f"/artist/{core_artist.public_id}",
                                providerUrl=f"https://music.youtube.com/channel/{artist.youtube_id}",
                                name=artist.name,
                                imageUrl=Image.get_internal_image_url(artist.image),
                                dominantColor=artist.image.dominant_color,
                            )
                        )

                image_url = Image.get_internal_image_url(track.image)
                track_dominant_color = track.image.dominant_color

                album_public_id = track.album.core_album.public_id

                is_downloaded = track.path is not None
                audio_src = (
                    f"{BACKEND_URL}/youtube-music/audio/{core_track.public_id}"
                    if is_downloaded
                    else None
                )

                top_songs.append(
                    YoutubeMusicTrackResponse(
                        provider=YoutubeMusic.provider_name,
                        publicId=core_track.public_id,
                        providerUrl=f"https://music.youtube.com/watch?v={track.youtube_id}",
                        name=track.title,
                        duration_ms=track.duration_ms,
                        trackNumber=track.track_number,
                        discNumber=track.disc_number,
                        imageUrl=image_url,
                        audioUrl=audio_src,
                        downloaded=is_downloaded,
                        artists=track_artists_list,
                        album=BaseAlbumWithoutSongsResponse(
                            provider=YoutubeMusic.provider_name,
                            publicId=album_public_id,
                            url=f"/album/{album_public_id}",
                            providerUrl=(
                                f"https://music.youtube.com/browse/{track.album.youtube_id}"
                            ),
                            name=track.album.title,
                            artists=[],
                            releaseDate=(track.album.release_date),
                            imageUrl=image_url,
                            dominantColor=track_dominant_color,
                        ),
                        youtubeId=track.youtube_id,
                        dominantColor=track_dominant_color,
                    )
                )

        image_url = Image.get_internal_image_url(db_artist.image)
        dominant_color = db_artist.image.dominant_color

        response = YoutubeMusicArtistResponse(
            provider=YoutubeMusic.provider_name,
            publicId=public_id,
            url=f"/artist/{public_id}",
            providerUrl=f"https://music.youtube.com/channel/{db_artist.youtube_id}",
            name=db_artist.name,
            imageUrl=image_url,
            dominantColor=dominant_color,
            topSongs=top_songs,
            albums=[],
            youtubeId=db_artist.youtube_id,
        )

        return AResult(code=AResultCode.OK, message="OK", result=response)

    @staticmethod
    @time_it
    async def get_tracks_batch_async(
        session: AsyncSession,
        public_ids: List[str],
    ) -> AResult[List[BaseSongWithAlbumResponse]]:
        """Batch fetch multiple tracks by public_ids efficiently."""
        a_result_tracks = await YoutubeMusicAccess.get_tracks_by_public_ids_async(
            session=session, public_ids=public_ids
        )
        if a_result_tracks.is_not_ok():
            return AResult(
                code=a_result_tracks.code(), message=a_result_tracks.message()
            )

        db_tracks = a_result_tracks.result()
        if not db_tracks:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        track_ids = [t.id for t in db_tracks]
        a_result_artists_map = (
            await YoutubeMusicAccess.get_artists_for_tracks_batch_async(
                session=session, track_ids=track_ids
            )
        )

        artists_map: Dict[int, List[ArtistRow]] = {}
        if a_result_artists_map.is_ok():
            artists_map = a_result_artists_map.result()

        track_by_public_id: Dict[str, BaseSongWithAlbumResponse] = {}
        for db_track in db_tracks:
            artists_list: List[BaseArtistResponse] = []
            track_artists = artists_map.get(db_track.id, [])
            for artist in track_artists:
                core_artist = artist.core_artist
                if core_artist:
                    artists_list.append(
                        BaseArtistResponse(
                            provider=YoutubeMusic.provider_name,
                            publicId=core_artist.public_id,
                            url=f"/artist/{core_artist.public_id}",
                            providerUrl=f"https://music.youtube.com/channel/{artist.youtube_id}",
                            name=artist.name,
                            imageUrl=Image.get_internal_image_url(artist.image),
                            dominantColor=artist.image.dominant_color,
                        )
                    )

            image_url = Image.get_internal_image_url(db_track.image)
            dominant_color = db_track.image.dominant_color

            is_downloaded = db_track.path is not None
            audio_src = (
                f"{BACKEND_URL}/youtube-music/audio/{db_track.core_song.public_id}"
                if is_downloaded
                else None
            )

            album_data = BaseAlbumWithoutSongsResponse(
                provider=YoutubeMusic.provider_name,
                publicId=db_track.album.core_album.public_id,
                url=f"/album/{db_track.album.core_album.public_id}",
                providerUrl=f"https://music.youtube.com/browse/{db_track.album.youtube_id}",
                name=db_track.album.title,
                artists=[],
                releaseDate=db_track.album.release_date,
                imageUrl=image_url,
                dominantColor=dominant_color,
            )

            track_by_public_id[db_track.core_song.public_id] = (
                YoutubeMusicTrackResponse(
                    provider=YoutubeMusic.provider_name,
                    publicId=db_track.core_song.public_id,
                    providerUrl=f"https://music.youtube.com/watch?v={db_track.youtube_id}",
                    name=db_track.title,
                    duration_ms=db_track.duration_ms,
                    trackNumber=db_track.track_number,
                    discNumber=db_track.disc_number,
                    imageUrl=image_url,
                    audioUrl=audio_src,
                    downloaded=is_downloaded,
                    artists=artists_list,
                    album=album_data,
                    youtubeId=db_track.youtube_id,
                    dominantColor=dominant_color,
                )
            )

        results: List[BaseSongWithAlbumResponse] = [
            track_by_public_id[pid] for pid in public_ids if pid in track_by_public_id
        ]

        return AResult(code=AResultCode.OK, message="OK", result=results)

    @staticmethod
    @time_it
    async def get_albums_batch_async(
        session: AsyncSession,
        public_ids: List[str],
    ) -> AResult[List[BaseAlbumWithSongsResponse]]:
        """Batch fetch multiple albums by public_ids efficiently."""
        a_result_albums = await YoutubeMusicAccess.get_albums_by_public_ids_async(
            session=session, public_ids=public_ids
        )
        if a_result_albums.is_not_ok():
            return AResult(
                code=a_result_albums.code(), message=a_result_albums.message()
            )

        db_albums = a_result_albums.result()
        if not db_albums:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        album_ids = [a.id for a in db_albums]
        a_result_tracks = await YoutubeMusicAccess.get_tracks_by_album_ids_async(
            session=session, album_ids=album_ids
        )

        tracks_by_album: Dict[int, List[TrackRow]] = {}
        all_track_ids: List[int] = []
        if a_result_tracks.is_ok():
            for track in a_result_tracks.result():
                if track.album_id not in tracks_by_album:
                    tracks_by_album[track.album_id] = []
                tracks_by_album[track.album_id].append(track)
                all_track_ids.append(track.id)

        a_result_track_artists_map = (
            await YoutubeMusicAccess.get_artists_for_tracks_batch_async(
                session=session, track_ids=all_track_ids
            )
        )
        track_artists_map: Dict[int, List[ArtistRow]] = {}
        if a_result_track_artists_map.is_ok():
            track_artists_map = a_result_track_artists_map.result()

        a_result_album_artists_map = (
            await YoutubeMusicAccess.get_artists_for_albums_batch_async(
                session=session, album_ids=album_ids
            )
        )
        album_artists_map: Dict[int, List[ArtistRow]] = {}
        if a_result_album_artists_map.is_ok():
            album_artists_map = a_result_album_artists_map.result()

        album_by_public_id: Dict[str, BaseAlbumWithSongsResponse] = {}
        for db_album in db_albums:
            album_artists_list: List[BaseArtistResponse] = []
            for artist in album_artists_map.get(db_album.id, []):
                core_artist = artist.core_artist
                if core_artist:
                    album_artists_list.append(
                        BaseArtistResponse(
                            provider=YoutubeMusic.provider_name,
                            publicId=core_artist.public_id,
                            url=f"/artist/{core_artist.public_id}",
                            providerUrl=f"https://music.youtube.com/channel/{artist.youtube_id}",
                            name=artist.name,
                            imageUrl=Image.get_internal_image_url(artist.image),
                            dominantColor=artist.image.dominant_color,
                        )
                    )

            album_tracks = tracks_by_album.get(db_album.id, [])
            undownloaded_count = sum(1 for t in album_tracks if t.path is None)
            songs_list: List[YoutubeMusicTrackResponse] = []
            for track in album_tracks:
                track_artists = track_artists_map.get(track.id, [])
                track_artists_list: List[BaseArtistResponse] = []
                for artist in track_artists:
                    core_artist = artist.core_artist
                    if core_artist:
                        track_artists_list.append(
                            BaseArtistResponse(
                                provider=YoutubeMusic.provider_name,
                                publicId=core_artist.public_id,
                                url=f"/artist/{core_artist.public_id}",
                                providerUrl=f"https://music.youtube.com/channel/{artist.youtube_id}",
                                name=artist.name,
                                imageUrl=Image.get_internal_image_url(artist.image),
                                dominantColor=(artist.image.dominant_color),
                            )
                        )

                is_downloaded = track.path is not None
                audio_src = (
                    f"{BACKEND_URL}/youtube-music/audio/{track.core_song.public_id}"
                    if is_downloaded
                    else None
                )

                songs_list.append(
                    YoutubeMusicTrackResponse(
                        provider=YoutubeMusic.provider_name,
                        publicId=track.core_song.public_id,
                        providerUrl=f"https://music.youtube.com/watch?v={track.youtube_id}",
                        name=track.title,
                        duration_ms=track.duration_ms,
                        trackNumber=track.track_number,
                        discNumber=track.disc_number,
                        imageUrl=Image.get_internal_image_url(track.image),
                        audioUrl=audio_src,
                        downloaded=is_downloaded,
                        artists=track_artists_list,
                        album=BaseAlbumWithoutSongsResponse(
                            provider=YoutubeMusic.provider_name,
                            publicId=db_album.core_album.public_id,
                            url=f"/album/{db_album.core_album.public_id}",
                            providerUrl=f"https://music.youtube.com/browse/{db_album.youtube_id}",
                            name=db_album.title,
                            artists=album_artists_list,
                            releaseDate=db_album.release_date,
                            imageUrl=Image.get_internal_image_url(track.image),
                            dominantColor=track.image.dominant_color,
                        ),
                        youtubeId=track.youtube_id,
                        dominantColor=track.image.dominant_color,
                    )
                )

            image_url = Image.get_internal_image_url(db_album.image)
            dominant_color = db_album.image.dominant_color

            album_by_public_id[db_album.core_album.public_id] = (
                YoutubeMusicAlbumResponse(
                    provider=YoutubeMusic.provider_name,
                    publicId=db_album.core_album.public_id,
                    url=f"/album/{db_album.core_album.public_id}",
                    providerUrl=f"https://music.youtube.com/browse/{db_album.youtube_id}",
                    name=db_album.title,
                    imageUrl=image_url,
                    dominantColor=dominant_color,
                    artists=album_artists_list,
                    releaseDate=db_album.release_date,
                    year=db_album.year,
                    songs=songs_list,
                    youtubeId=db_album.youtube_id,
                    undownloadedCount=undownloaded_count,
                )
            )

        results: List[BaseAlbumWithSongsResponse] = [
            album_by_public_id[pid] for pid in public_ids if pid in album_by_public_id
        ]

        return AResult(code=AResultCode.OK, message="OK", result=results)

    @staticmethod
    async def get_audio_with_range_async(
        session: AsyncSession, public_id: str, request: Request
    ) -> AResult[tuple[bytes, int, str]]:
        """Get audio file bytes with HTTP range support for HTML audio element seeking.

        Returns: tuple of (content_bytes, status_code, content_range_header)
        """
        a_result_track = await YoutubeMusicAccess.get_track_by_public_id_async(
            session=session, public_id=public_id
        )
        if a_result_track.is_not_ok():
            logger.error(f"Error getting track. {a_result_track.info()}")
            return AResult(code=a_result_track.code(), message=a_result_track.message())

        track_row = a_result_track.result()

        if not track_row.path:
            logger.error(f"Track {public_id} has no audio file downloaded.")
            return AResult(
                code=AResultCode.NOT_FOUND, message="Audio file not downloaded"
            )

        full_path: str = os.path.join(MEDIA_PATH, track_row.path)
        if not os.path.exists(full_path):
            logger.error(f"Audio file not found at {full_path}")
            return AResult(code=AResultCode.NOT_FOUND, message="Audio file not found")

        file_size: int = os.path.getsize(full_path)
        range_header: str | None = request.headers.get("Range")

        if range_header:
            range_match = re.match(r"bytes=(\d+)-(\d*)", range_header)
            if range_match:
                start: int = int(range_match.group(1))
                end_str: str | None = range_match.group(2)
                end: int = int(end_str) if end_str else file_size - 1
            else:
                start = 0
                end = file_size - 1
        else:
            start = 0
            end = file_size - 1

        end = min(end, file_size - 1)
        content_length: int = end - start + 1

        with open(full_path, "rb") as f:
            f.seek(start)
            content: bytes = f.read(content_length)

        content_range: str = f"bytes {start}-{end}/{file_size}"
        status_code: int = 206 if range_header else 200

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=(content, status_code, content_range),
        )


youtube_music = YoutubeMusic()
