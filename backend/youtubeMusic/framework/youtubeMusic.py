import os
import re
from typing import Dict, List, TYPE_CHECKING

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.constants import BACKEND_URL, MEDIA_PATH
from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode

from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from backend.core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)
from backend.core.responses.baseArtistResponse import BaseArtistResponse

from backend.youtubeMusic.utils.youtubeMusicApi import YoutubeMusicApi
from backend.youtubeMusic.utils.youtubeMusicApi import (
    YoutubeMusicTrack,
    YoutubeMusicAlbum,
    YoutubeMusicArtist,
)

from backend.youtubeMusic.access.youtubeMusicAccess import YoutubeMusicAccess

from backend.youtubeMusic.responses.songResponse import YoutubeMusicTrackResponse
from backend.youtubeMusic.responses.albumResponse import YoutubeMusicAlbumResponse
from backend.youtubeMusic.responses.artistResponse import YoutubeMusicArtistResponse

from backend.core.framework.provider.baseProvider import BaseProvider

if TYPE_CHECKING:
    from backend.youtubeMusic.access.db.ormModels.track import TrackRow
    from backend.youtubeMusic.access.db.ormModels.album import AlbumRow
    from backend.youtubeMusic.access.db.ormModels.artist import ArtistRow

logger = getLogger(__name__)


class YoutubeMusic:
    provider: BaseProvider
    provider_name: str

    @staticmethod
    async def get_provider_id() -> AResult[int]:
        a_result: AResult[int] = YoutubeMusic.provider.get_id()
        if a_result.is_not_ok():
            logger.error(f"Error getting provider id. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())
        return a_result

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
            a_result_artist = await YoutubeMusicAccess.get_or_create_artist(
                session=session, raw=artist_api, provider_id=provider_id
            )
            if a_result_artist.is_ok():
                artist_map[artist_name] = a_result_artist.result()

        a_result_album = await YoutubeMusicAccess.get_or_create_album(
            session=session,
            raw=album_api,
            artist_map=artist_map,
            provider_id=provider_id,
        )
        if a_result_album.is_not_ok():
            return AResult(code=a_result_album.code(), message=a_result_album.message())
        album_row = a_result_album.result()

        a_result_track = await YoutubeMusicAccess.get_or_create_track(
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
            a_result_artist = await YoutubeMusicAccess.get_or_create_artist(
                session=session, raw=artist_api, provider_id=provider_id
            )
            if a_result_artist.is_ok():
                artist_map[artist_name] = a_result_artist.result()

        a_result_album = await YoutubeMusicAccess.get_or_create_album(
            session=session,
            raw=album_api,
            artist_map=artist_map,
            provider_id=provider_id,
        )
        if a_result_album.is_not_ok():
            return AResult(code=a_result_album.code(), message=a_result_album.message())
        album_row = a_result_album.result()

        for track_api in tracks_api:
            await YoutubeMusicAccess.get_or_create_track(
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

        a_result_artist = await YoutubeMusicAccess.get_or_create_artist(
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
            a_result_album = await YoutubeMusicAccess.get_or_create_album(
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
            await YoutubeMusicAccess.get_or_create_track(
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
                            url=f"{BACKEND_URL}/artist/{core_artist.public_id}",
                            providerUrl=f"https://music.youtube.com/channel/{artist.youtube_id}",
                            name=artist.name,
                            imageUrl="",
                        )
                    )

            image_url = ""
            if db_track.image and db_track.image.url:
                image_url = db_track.image.url

            is_downloaded = db_track.path is not None
            audio_src = (
                f"{BACKEND_URL}/youtube-music/audio/{public_id}"
                if is_downloaded
                else None
            )

            album_data = BaseAlbumWithoutSongsResponse(
                provider=YoutubeMusic.provider_name,
                publicId=db_track.album.core_album.public_id,
                url=f"{BACKEND_URL}/album/{db_track.album.core_album.public_id}",
                providerUrl=f"https://music.youtube.com/browse/{db_track.album.youtube_id}",
                name=db_track.album.title,
                artists=[],
                releaseDate=db_track.album.release_date,
                imageUrl=image_url,
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
                audioSrc=audio_src,
                downloaded=is_downloaded,
                artists=artists_list,
                album=album_data,
            )

            return AResult(code=AResultCode.OK, message="OK", result=response)

        except Exception as e:
            logger.error(f"Failed to get track: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get track: {e}",
            )

    @staticmethod
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

            a_result_album_info = await YoutubeMusicApi.get_album_info_async(
                youtube_id=youtube_id
            )
            if a_result_album_info.is_not_ok():
                logger.error(f"Error getting album info. {a_result_album_info.info()}")
                return AResult(
                    code=a_result_album_info.code(),
                    message=a_result_album_info.message(),
                )

            album_info = a_result_album_info.result()

            a_result_db_album = await YoutubeMusicAccess.get_album_by_youtube_id_async(
                session=session, youtube_id=youtube_id
            )
            if a_result_db_album.is_not_ok():
                logger.error(f"Error getting album from DB. {a_result_db_album.info()}")
                return AResult(
                    code=a_result_db_album.code(),
                    message=a_result_db_album.message(),
                )

            db_album = a_result_db_album.result()

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
                            url=f"{BACKEND_URL}/artist/{core_artist.public_id}",
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
                    track_artists = (
                        await YoutubeMusicAccess.get_artists_from_track_async(
                            session=session, track=track
                        )
                    )
                    track_artists_list: List[BaseArtistResponse] = []
                    if track_artists.is_ok():
                        for artist in track_artists.result():
                            core_artist = artist.core_artist
                            track_artists_list.append(
                                BaseArtistResponse(
                                    provider=YoutubeMusic.provider_name,
                                    publicId=core_artist.public_id,
                                    url=f"{BACKEND_URL}/artist/{core_artist.public_id}",
                                    providerUrl=f"https://music.youtube.com/channel/{artist.youtube_id}",
                                    name=artist.name,
                                    imageUrl="",
                                )
                            )

                    image_url = ""
                    if track.image and track.image.url:
                        image_url = track.image.url
                    elif album_info.thumbnail_url:
                        image_url = album_info.thumbnail_url

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
                            audioSrc=audio_src,
                            downloaded=is_downloaded,
                            artists=track_artists_list,
                            album=BaseAlbumWithoutSongsResponse(
                                provider=YoutubeMusic.provider_name,
                                publicId=public_id,
                                url=f"{BACKEND_URL}/album/{public_id}",
                                providerUrl=f"https://music.youtube.com/browse/{youtube_id}",
                                name=album_info.title,
                                artists=artists_list,
                                releaseDate=db_album.release_date,
                                imageUrl=album_info.thumbnail_url,
                            ),
                            youtubeId=track.youtube_id,
                        )
                    )

            image_url = ""
            if db_album.image and db_album.image.url:
                image_url = db_album.image.url
            elif album_info.thumbnail_url:
                image_url = album_info.thumbnail_url

            response = YoutubeMusicAlbumResponse(
                provider=YoutubeMusic.provider_name,
                publicId=public_id,
                url=f"{BACKEND_URL}/album/{public_id}",
                providerUrl=f"https://music.youtube.com/browse/{youtube_id}",
                name=album_info.title,
                imageUrl=image_url,
                artists=artists_list,
                releaseDate=db_album.release_date,
                year=album_info.release_year,
                songs=songs_list,
                youtubeId=youtube_id,
            )

            return AResult(code=AResultCode.OK, message="OK", result=response)

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

            a_result_artist_info = await YoutubeMusicApi.get_artist_info_async(
                youtube_id=youtube_id
            )
            if a_result_artist_info.is_not_ok():
                logger.error(
                    f"Error getting artist info. {a_result_artist_info.info()}"
                )
                return AResult(
                    code=a_result_artist_info.code(),
                    message=a_result_artist_info.message(),
                )

            artist_info = a_result_artist_info.result()

            a_result_db_artist = (
                await YoutubeMusicAccess.get_artist_by_youtube_id_async(
                    session=session, youtube_id=youtube_id
                )
            )
            if a_result_db_artist.is_not_ok():
                logger.error(
                    f"Error getting artist from DB. {a_result_db_artist.info()}"
                )
                return AResult(
                    code=a_result_db_artist.code(),
                    message=a_result_db_artist.message(),
                )

            db_artist = a_result_db_artist.result()

            a_result_tracks = await YoutubeMusicAccess.get_tracks_from_artist_id_async(
                session=session, artist_id=db_artist.id
            )
            top_songs: List[YoutubeMusicTrackResponse] = []
            if a_result_tracks.is_ok():
                for track in a_result_tracks.result():
                    core_track = track.core_song
                    track_artists = (
                        await YoutubeMusicAccess.get_artists_from_track_async(
                            session=session, track=track
                        )
                    )
                    track_artists_list: List[BaseArtistResponse] = []
                    if track_artists.is_ok():
                        for artist in track_artists.result():
                            core_artist = artist.core_artist
                            track_artists_list.append(
                                BaseArtistResponse(
                                    provider=YoutubeMusic.provider_name,
                                    publicId=core_artist.public_id,
                                    url=f"{BACKEND_URL}/artist/{core_artist.public_id}",
                                    providerUrl=f"https://music.youtube.com/channel/{artist.youtube_id}",
                                    name=artist.name,
                                    imageUrl="",
                                )
                            )

                    image_url = ""
                    if track.image and track.image.url:
                        image_url = track.image.url
                    elif artist_info.thumbnail_url:
                        image_url = artist_info.thumbnail_url

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
                            audioSrc=audio_src,
                            downloaded=is_downloaded,
                            artists=track_artists_list,
                            album=BaseAlbumWithoutSongsResponse(
                                provider=YoutubeMusic.provider_name,
                                publicId=album_public_id,
                                url=f"{BACKEND_URL}/album/{album_public_id}",
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
                            ),
                            youtubeId=track.youtube_id,
                        )
                    )

            image_url = ""
            if db_artist.image and db_artist.image.url:
                image_url = db_artist.image.url
            elif artist_info.thumbnail_url:
                image_url = artist_info.thumbnail_url

            response = YoutubeMusicArtistResponse(
                provider=YoutubeMusic.provider_name,
                publicId=public_id,
                url=f"{BACKEND_URL}/artist/{public_id}",
                providerUrl=f"https://music.youtube.com/channel/{youtube_id}",
                name=artist_info.name,
                imageUrl=image_url,
                topSongs=top_songs,
                albums=[],
                youtubeId=youtube_id,
            )

            return AResult(code=AResultCode.OK, message="OK", result=response)

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
        a_result_track_api = await YoutubeMusicApi.get_track_info_async(
            youtube_id=db_track.youtube_id
        )
        if a_result_track_api.is_not_ok():
            logger.error(f"Error getting track info. {a_result_track_api.info()}")
            return AResult(
                code=a_result_track_api.code(), message=a_result_track_api.message()
            )

        track_info = a_result_track_api.result()

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
                        url=f"{BACKEND_URL}/artist/{core_artist.public_id}",
                        providerUrl=f"https://music.youtube.com/channel/{artist.youtube_id}",
                        name=artist.name,
                        imageUrl="",
                    )
                )

        image_url = ""
        if db_track.image and db_track.image.url:
            image_url = db_track.image.url
        elif track_info.thumbnail_url:
            image_url = track_info.thumbnail_url

        is_downloaded = db_track.path is not None
        audio_src = (
            f"{BACKEND_URL}/youtube-music/audio/{public_id}" if is_downloaded else None
        )

        album_data = BaseAlbumWithoutSongsResponse(
            provider=YoutubeMusic.provider_name,
            publicId=db_track.album.core_album.public_id,
            url=f"{BACKEND_URL}/album/{db_track.album.core_album.public_id}",
            providerUrl=f"https://music.youtube.com/browse/{db_track.album.youtube_id}",
            name=db_track.album.title,
            artists=[],
            releaseDate=db_track.album.release_date,
            imageUrl=image_url,
        )

        response = YoutubeMusicTrackResponse(
            provider=YoutubeMusic.provider_name,
            publicId=public_id,
            providerUrl=f"https://music.youtube.com/watch?v={db_track.youtube_id}",
            name=track_info.title,
            duration_ms=track_info.duration_ms,
            trackNumber=db_track.track_number,
            discNumber=db_track.disc_number,
            imageUrl=image_url,
            audioSrc=audio_src,
            downloaded=is_downloaded,
            artists=artists_list,
            album=album_data,
            youtubeId=db_track.youtube_id,
        )

        return AResult(code=AResultCode.OK, message="OK", result=response)

    @staticmethod
    async def _build_album_response(
        session: AsyncSession,
        db_album: "AlbumRow",
        public_id: str,
    ) -> AResult[BaseAlbumWithSongsResponse]:
        a_result_album_api = await YoutubeMusicApi.get_album_info_async(
            youtube_id=db_album.youtube_id
        )
        if a_result_album_api.is_not_ok():
            logger.error(f"Error getting album info. {a_result_album_api.info()}")
            return AResult(
                code=a_result_album_api.code(), message=a_result_album_api.message()
            )

        album_info = a_result_album_api.result()

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
                        url=f"{BACKEND_URL}/artist/{core_artist.public_id}",
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
                                url=f"{BACKEND_URL}/artist/{core_artist.public_id}",
                                providerUrl=f"https://music.youtube.com/channel/{artist.youtube_id}",
                                name=artist.name,
                                imageUrl="",
                            )
                        )

                image_url = ""
                if track.image and track.image.url:
                    image_url = track.image.url
                elif album_info.thumbnail_url:
                    image_url = album_info.thumbnail_url

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
                        audioSrc=audio_src,
                        downloaded=is_downloaded,
                        artists=track_artists_list,
                        album=BaseAlbumWithoutSongsResponse(
                            provider=YoutubeMusic.provider_name,
                            publicId=public_id,
                            url=f"{BACKEND_URL}/album/{public_id}",
                            providerUrl=f"https://music.youtube.com/browse/{db_album.youtube_id}",
                            name=album_info.title,
                            artists=artists_list,
                            releaseDate=db_album.release_date,
                            imageUrl=album_info.thumbnail_url,
                        ),
                        youtubeId=track.youtube_id,
                    )
                )

        image_url = ""
        if db_album.image and db_album.image.url:
            image_url = db_album.image.url
        elif album_info.thumbnail_url:
            image_url = album_info.thumbnail_url

        response = YoutubeMusicAlbumResponse(
            provider=YoutubeMusic.provider_name,
            publicId=public_id,
            url=f"{BACKEND_URL}/album/{public_id}",
            providerUrl=f"https://music.youtube.com/browse/{db_album.youtube_id}",
            name=album_info.title,
            imageUrl=image_url,
            artists=artists_list,
            releaseDate=db_album.release_date,
            year=album_info.release_year,
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
        a_result_artist_api = await YoutubeMusicApi.get_artist_info_async(
            youtube_id=db_artist.youtube_id
        )
        if a_result_artist_api.is_not_ok():
            logger.error(f"Error getting artist info. {a_result_artist_api.info()}")
            return AResult(
                code=a_result_artist_api.code(), message=a_result_artist_api.message()
            )

        artist_info = a_result_artist_api.result()

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
                                url=f"{BACKEND_URL}/artist/{core_artist.public_id}",
                                providerUrl=f"https://music.youtube.com/channel/{artist.youtube_id}",
                                name=artist.name,
                                imageUrl="",
                            )
                        )

                image_url = ""
                if track.image and track.image.url:
                    image_url = track.image.url
                elif artist_info.thumbnail_url:
                    image_url = artist_info.thumbnail_url

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
                        audioSrc=audio_src,
                        downloaded=is_downloaded,
                        artists=track_artists_list,
                        album=BaseAlbumWithoutSongsResponse(
                            provider=YoutubeMusic.provider_name,
                            publicId=album_public_id,
                            url=f"{BACKEND_URL}/album/{album_public_id}",
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
                        ),
                        youtubeId=track.youtube_id,
                    )
                )

        image_url = ""
        if db_artist.image and db_artist.image.url:
            image_url = db_artist.image.url
        elif artist_info.thumbnail_url:
            image_url = artist_info.thumbnail_url

        response = YoutubeMusicArtistResponse(
            provider=YoutubeMusic.provider_name,
            publicId=public_id,
            url=f"{BACKEND_URL}/artist/{public_id}",
            providerUrl=f"https://music.youtube.com/channel/{db_artist.youtube_id}",
            name=artist_info.name,
            imageUrl=image_url,
            topSongs=top_songs,
            albums=[],
            youtubeId=db_artist.youtube_id,
        )

        return AResult(code=AResultCode.OK, message="OK", result=response)

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
