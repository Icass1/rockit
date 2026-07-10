import os
import re
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

from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from backend.core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)

from backend.youtubeMusic.utils.youtubeMusicApi import YoutubeMusicApi
from backend.youtubeMusic.utils.youtubeMusicApi import (
    YoutubeMusicTrack,
    YoutubeMusicAlbum,
    YoutubeMusicArtist,
)

from backend.youtubeMusic.access.youtubeMusicAccess import YoutubeMusicAccess

from backend.youtubeMusic.framework.download.imageDownload import ImageDownload

from backend.youtubeMusic.responses.songResponse import YoutubeMusicTrackResponse
from backend.youtubeMusic.responses.albumResponse import YoutubeMusicAlbumResponse
from backend.youtubeMusic.responses.artistResponse import YoutubeMusicArtistResponse

if TYPE_CHECKING:
    from backend.youtubeMusic.access.db.ormModels.track import TrackRow
    from backend.youtubeMusic.access.db.ormModels.album import AlbumRow
    from backend.youtubeMusic.access.db.ormModels.artist import ArtistRow

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
                            imageUrl="",
                        )
                    )

            image_url = ""
            dominant_color = None
            if db_track.image and db_track.image.public_id:
                image_url = BACKEND_URL + "/media/image/" + db_track.image.public_id
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
                        imageUrl="",
                    )
                )

        image_url = ""
        dominant_color = None
        if db_track.image and db_track.image.public_id:
            image_url = BACKEND_URL + "/media/image/" + db_track.image.public_id
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
                        imageUrl="",
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
                                imageUrl="",
                            )
                        )

                image_url = ""
                track_dominant_color = None
                if track.image and track.image.public_id:
                    image_url = BACKEND_URL + "/media/image/" + track.image.public_id
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

        image_url = ""
        dominant_color = None
        if db_album.image and db_album.image.public_id:
            image_url = BACKEND_URL + "/media/image/" + db_album.image.public_id
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
                                imageUrl="",
                            )
                        )

                image_url = ""
                track_dominant_color = None
                if track.image and track.image.public_id:
                    image_url = BACKEND_URL + "/media/image/" + track.image.public_id
                    track_dominant_color = track.image.dominant_color

                album_public_id = ""
                if track.album and track.album.core_album:
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
                                if track.album
                                else ""
                            ),
                            name=track.album.title if track.album else "",
                            artists=[],
                            releaseDate=(
                                track.album.release_date if track.album else ""
                            ),
                            imageUrl=image_url,
                            dominantColor=track_dominant_color,
                        ),
                        youtubeId=track.youtube_id,
                        dominantColor=track_dominant_color,
                    )
                )

        image_url = ""
        dominant_color: str | None = None
        if db_artist.image and db_artist.image.public_id:
            image_url = BACKEND_URL + "/media/image/" + db_artist.image.public_id
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
                            imageUrl="",
                        )
                    )

            image_url = ""
            dominant_color = None
            if db_track.image and db_track.image.public_id:
                image_url = BACKEND_URL + "/media/image/" + db_track.image.public_id
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
                            imageUrl="",
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
                                imageUrl="",
                            )
                        )

                image_url = ""
                track_dominant_color = None
                if track.image and track.image.public_id:
                    image_url = BACKEND_URL + "/media/image/" + track.image.public_id
                    track_dominant_color = track.image.dominant_color

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
                        imageUrl=image_url,
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
                            imageUrl=image_url,
                            dominantColor=track_dominant_color,
                        ),
                        youtubeId=track.youtube_id,
                        dominantColor=track_dominant_color,
                    )
                )

            image_url = ""
            dominant_color = None
            if db_album.image and db_album.image.public_id:
                image_url = BACKEND_URL + "/media/image/" + db_album.image.public_id
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
