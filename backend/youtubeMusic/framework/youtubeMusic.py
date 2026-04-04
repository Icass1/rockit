from typing import Dict, List, TYPE_CHECKING

from sqlalchemy.ext.asyncio import AsyncSession

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

PROVIDER_NAME = "YouTube Music"


class YoutubeMusic:
    provider: BaseProvider

    @staticmethod
    def set_provider(provider: "BaseProvider") -> None:
        YoutubeMusic.provider = provider

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
            a_result_youtube_id = (
                await YoutubeMusicAccess.get_track_youtube_id_from_public_id_async(
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

            a_result_track = await YoutubeMusicApi.get_track_info_async(
                youtube_id=youtube_id
            )
            if a_result_track.is_not_ok():
                logger.error(f"Error getting track info. {a_result_track.info()}")
                return AResult(
                    code=a_result_track.code(),
                    message=a_result_track.message(),
                )

            track_info = a_result_track.result()

            a_result_db_track = await YoutubeMusicAccess.get_track_by_youtube_id_async(
                session=session, youtube_id=youtube_id
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
                            provider="YouTube Music",
                            publicId=core_artist.public_id,
                            url=f"/youtube-music/artist/{core_artist.public_id}",
                            name=artist.name,
                            imageUrl="",
                        )
                    )

            image_url = ""
            if db_track.image and db_track.image.url:
                image_url = db_track.image.url
            elif track_info.thumbnail_url:
                image_url = track_info.thumbnail_url

            album_data = BaseAlbumWithoutSongsResponse(
                provider="YouTube Music",
                publicId=db_track.album.core_album.public_id,
                url=f"/youtube-music/album/{db_track.album.core_album.public_id}",
                name=db_track.album.title,
                artists=[],
                releaseDate=db_track.album.release_date,
                imageUrl=image_url,
            )

            response = YoutubeMusicTrackResponse(
                provider="YouTube Music",
                publicId=public_id,
                url=f"/youtube-music/track/{public_id}",
                name=track_info.title,
                duration_ms=track_info.duration_ms,
                trackNumber=db_track.track_number,
                discNumber=db_track.disc_number,
                imageUrl=image_url,
                audioSrc=None,
                downloaded=False,
                artists=artists_list,
                album=album_data,
                youtubeId=youtube_id,
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
                            provider="YouTube Music",
                            publicId=core_artist.public_id,
                            url=f"/youtube-music/artist/{core_artist.public_id}",
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
                                    provider="YouTube Music",
                                    publicId=core_artist.public_id,
                                    url=f"/youtube-music/artist/{core_artist.public_id}",
                                    name=artist.name,
                                    imageUrl="",
                                )
                            )

                    image_url = ""
                    if track.image and track.image.url:
                        image_url = track.image.url
                    elif album_info.thumbnail_url:
                        image_url = album_info.thumbnail_url

                    songs_list.append(
                        YoutubeMusicTrackResponse(
                            provider="YouTube Music",
                            publicId=core_track.public_id,
                            url=f"/youtube-music/track/{core_track.public_id}",
                            name=track.title,
                            duration_ms=track.duration_ms,
                            trackNumber=track.track_number,
                            discNumber=track.disc_number,
                            imageUrl=image_url,
                            audioSrc=None,
                            downloaded=False,
                            artists=track_artists_list,
                            album=BaseAlbumWithoutSongsResponse(
                                provider="YouTube Music",
                                publicId=public_id,
                                url=f"/youtube-music/album/{public_id}",
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
                provider="YouTube Music",
                publicId=public_id,
                url=f"/youtube-music/album/{public_id}",
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
                                    provider="YouTube Music",
                                    publicId=core_artist.public_id,
                                    url=f"/youtube-music/artist/{core_artist.public_id}",
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

                    top_songs.append(
                        YoutubeMusicTrackResponse(
                            provider="YouTube Music",
                            publicId=core_track.public_id,
                            url=f"/youtube-music/track/{core_track.public_id}",
                            name=track.title,
                            duration_ms=track.duration_ms,
                            trackNumber=track.track_number,
                            discNumber=track.disc_number,
                            imageUrl=image_url,
                            audioSrc=None,
                            downloaded=False,
                            artists=track_artists_list,
                            album=BaseAlbumWithoutSongsResponse(
                                provider="YouTube Music",
                                publicId=album_public_id,
                                url=f"/youtube-music/album/{album_public_id}",
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
                provider="YouTube Music",
                publicId=public_id,
                url=f"/youtube-music/artist/{public_id}",
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
                        provider=PROVIDER_NAME,
                        publicId=core_artist.public_id,
                        url=f"/youtube-music/artist/{core_artist.public_id}",
                        name=artist.name,
                        imageUrl="",
                    )
                )

        image_url = ""
        if db_track.image and db_track.image.url:
            image_url = db_track.image.url
        elif track_info.thumbnail_url:
            image_url = track_info.thumbnail_url

        album_data = BaseAlbumWithoutSongsResponse(
            provider=PROVIDER_NAME,
            publicId=db_track.album.core_album.public_id,
            url=f"/youtube-music/album/{db_track.album.core_album.public_id}",
            name=db_track.album.title,
            artists=[],
            releaseDate=db_track.album.release_date,
            imageUrl=image_url,
        )

        response = YoutubeMusicTrackResponse(
            provider=PROVIDER_NAME,
            publicId=public_id,
            url=f"/youtube-music/track/{public_id}",
            name=track_info.title,
            duration_ms=track_info.duration_ms,
            trackNumber=db_track.track_number,
            discNumber=db_track.disc_number,
            imageUrl=image_url,
            audioSrc=None,
            downloaded=False,
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
                        provider=PROVIDER_NAME,
                        publicId=core_artist.public_id,
                        url=f"/youtube-music/artist/{core_artist.public_id}",
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
                                provider=PROVIDER_NAME,
                                publicId=core_artist.public_id,
                                url=f"/youtube-music/artist/{core_artist.public_id}",
                                name=artist.name,
                                imageUrl="",
                            )
                        )

                image_url = ""
                if track.image and track.image.url:
                    image_url = track.image.url
                elif album_info.thumbnail_url:
                    image_url = album_info.thumbnail_url

                songs_list.append(
                    YoutubeMusicTrackResponse(
                        provider=PROVIDER_NAME,
                        publicId=core_track.public_id,
                        url=f"/youtube-music/track/{core_track.public_id}",
                        name=track.title,
                        duration_ms=track.duration_ms,
                        trackNumber=track.track_number,
                        discNumber=track.disc_number,
                        imageUrl=image_url,
                        audioSrc=None,
                        downloaded=False,
                        artists=track_artists_list,
                        album=BaseAlbumWithoutSongsResponse(
                            provider=PROVIDER_NAME,
                            publicId=public_id,
                            url=f"/youtube-music/album/{public_id}",
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
            provider=PROVIDER_NAME,
            publicId=public_id,
            url=f"/youtube-music/album/{public_id}",
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
                                provider=PROVIDER_NAME,
                                publicId=core_artist.public_id,
                                url=f"/youtube-music/artist/{core_artist.public_id}",
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

                top_songs.append(
                    YoutubeMusicTrackResponse(
                        provider=PROVIDER_NAME,
                        publicId=core_track.public_id,
                        url=f"/youtube-music/track/{core_track.public_id}",
                        name=track.title,
                        duration_ms=track.duration_ms,
                        trackNumber=track.track_number,
                        discNumber=track.disc_number,
                        imageUrl=image_url,
                        audioSrc=None,
                        downloaded=False,
                        artists=track_artists_list,
                        album=BaseAlbumWithoutSongsResponse(
                            provider=PROVIDER_NAME,
                            publicId=album_public_id,
                            url=f"/youtube-music/album/{album_public_id}",
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
            provider=PROVIDER_NAME,
            publicId=public_id,
            url=f"/youtube-music/artist/{public_id}",
            name=artist_info.name,
            imageUrl=image_url,
            topSongs=top_songs,
            albums=[],
            youtubeId=db_artist.youtube_id,
        )

        return AResult(code=AResultCode.OK, message="OK", result=response)


youtube_music = YoutubeMusic()
