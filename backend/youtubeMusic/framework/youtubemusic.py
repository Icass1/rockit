from typing import List

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

from backend.youtubeMusic.access.youtubeMusicAccess import YoutubeMusicAccess

from backend.youtubeMusic.responses.songResponse import YoutubeMusicTrackResponse
from backend.youtubeMusic.responses.albumResponse import YoutubeMusicAlbumResponse
from backend.youtubeMusic.responses.artistResponse import YoutubeMusicArtistResponse

logger = getLogger(__name__)


class YoutubeMusic:
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
                duration=track_info.duration_ms,
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
                    core_track = track.core_media
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
                            duration=track.duration_ms,
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
                    core_track = track.core_media
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
                            duration=track.duration_ms,
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


youtube_music = YoutubeMusic()
