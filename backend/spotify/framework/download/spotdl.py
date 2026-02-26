from typing import List
from spotdl.types.song import Song as SpotdlSong  # type: ignore

from backend.spotify.access.db.ormModels.album import AlbumRow
from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode

from backend.core.access.db.ormModels.album import CoreAlbumRow
from backend.core.access.db.ormModels.song import CoreSongRow
from backend.core.access.mediaAccess import MediaAccess

from backend.spotify.access.db.ormModels.artist import ArtistRow
from backend.spotify.access.db.ormModels.track import TrackRow
from backend.spotify.access.spotifyAccess import SpotifyAccess

logger = getLogger(__name__)


class SpotDL:
    @staticmethod
    async def get_spotdl_song_from_song_row(track_row: TrackRow) -> AResult[SpotdlSong]:
        """TODO"""

        a_result_track_artists: AResult[List[ArtistRow]] = (
            await SpotifyAccess.get_artists_from_track_row_async(track_row=track_row)
        )
        if a_result_track_artists.is_not_ok():
            logger.error(
                f"Error getting artists from track row {a_result_track_artists.info()}"
            )
            return AResult(
                code=a_result_track_artists.code(),
                message=a_result_track_artists.message(),
            )

        track_artists: List[ArtistRow] = a_result_track_artists.result()

        a_result_album: AResult[AlbumRow] = await SpotifyAccess.get_album_id_async(
            id=track_row.album_id
        )
        if a_result_album.is_not_ok():
            logger.error(f"Error getting album from id. {a_result_album.info()}")
            return AResult(code=a_result_album.code(), message=a_result_album.message())

        album: AlbumRow = a_result_album.result()

        a_result_album_artists: AResult[List[ArtistRow]] = (
            await SpotifyAccess.get_artists_from_album_id_async(
                album_id=track_row.album_id
            )
        )
        if a_result_album_artists.is_not_ok():
            logger.error(
                f"Error getting artists from album row {a_result_album_artists.info()}"
            )
            return AResult(
                code=a_result_album_artists.code(),
                message=a_result_album_artists.message(),
            )

        album_artists: List[ArtistRow] = a_result_album_artists.result()

        a_result_core_song: AResult[CoreSongRow] = (
            await MediaAccess.get_song_from_id_async(id=track_row.id)
        )
        if a_result_core_song.is_not_ok():
            logger.error(
                f"Error getting core song for id {track_row.id}. {a_result_core_song.info()}"
            )
            return AResult(
                code=a_result_core_song.code(), message=a_result_core_song.message()
            )

        core_song: CoreSongRow = a_result_core_song.result()

        a_result_core_album: AResult[CoreAlbumRow] = (
            await MediaAccess.get_album_from_id_async(id=track_row.album_id)
        )
        if a_result_core_album.is_not_ok():
            logger.error(
                f"Error getting core album for id {track_row.id}. {a_result_core_album.info()}"
            )
            return AResult(
                code=a_result_core_album.code(), message=a_result_core_album.message()
            )

        core_album: CoreAlbumRow = a_result_core_album.result()

        song = SpotdlSong(
            name=track_row.name,
            artists=[artist.name for artist in track_artists],
            artist=track_artists[0].name,
            genres=[],
            disc_number=1,
            disc_count=1,
            album_name=album.name,
            album_artist=album_artists[0].name,
            album_type="album",
            album_id=core_album.public_id,
            duration=track_row.duration,
            year=1,
            date="date",
            track_number=1,
            tracks_count=1,
            song_id=track_row.spotify_id,
            explicit=False,
            publisher="publisher",
            url=f"https://open.spotify.com/track/{core_song.public_id}",
            isrc=track_row.isrc,
            cover_url="cover_url",
            copyright_text="copyright_text",
            download_url=track_row.download_url,
        )

        return AResult(code=AResultCode.OK, message="OK", result=song)
