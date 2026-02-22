from spotdl.types.song import Song as SpotdlSong  # type: ignore

from backend.spotify.framework.download.messageHandler import MessageHandler
from backend.spotify.utils.utils import get_song_name
from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode

from backend.spotify.access.db.ormModels.track import TrackRow
from backend.spotify.access.spotifyAccess import SpotifyAccess
from backend.spotify.framework.download.spotdl import SpotDL

from backend.core.framework.downloader.baseDownload import BaseDownload


from backend.spotify.framework.download import spotify_downloader

logger = getLogger(__name__)


class SpotifyDownload(BaseDownload):
    track_id: int
    download_url: str | None
    _message_handler: MessageHandler

    def __init__(
        self,
        public_id: str,
        download_id: int,
        track_id: int,
        download_url: str | None,
    ):
        """Create a SpotifyDownload for a single track."""

        super().__init__(public_id=public_id, download_id=download_id)
        self.track_id = track_id
        self.download_url = download_url

        self._message_handler = MessageHandler()

    def get_message_handler(self) -> MessageHandler:
        return self._message_handler

    async def get_spotdl_song_async(self) -> AResult[SpotdlSong]:

        a_result_track_row: AResult[TrackRow] = await SpotifyAccess.get_track_id_async(self.track_id)
        if a_result_track_row.is_not_ok():
            logger.error(
                f"Error getting track from id. {a_result_track_row.info()}")
            return AResult(code=a_result_track_row.code(), message=a_result_track_row.message())

        a_result_spotdl_song: AResult[SpotdlSong] = await SpotDL.get_spotdl_song_from_song_row(track_row=a_result_track_row.result())
        if a_result_spotdl_song.is_not_ok():
            logger.error(
                f"Error getting spotdl song from track. {a_result_spotdl_song.info()}")
            return AResult(code=a_result_spotdl_song.code(), message=a_result_track_row.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result_spotdl_song.result())

    async def download_method_async(self) -> AResultCode:
        """Download the Spotify track. Placeholder — not yet implemented."""

        logger.info(f"download_method {self.track_id}")

        a_result_spotdl_song: AResult[SpotdlSong] = await self.get_spotdl_song_async()
        if a_result_spotdl_song.is_not_ok():
            logger.error(
                f"Error getting spotdl song. {a_result_spotdl_song.info()}")
            return AResultCode(code=a_result_spotdl_song.code(), message=a_result_spotdl_song.message())

        spotdl_song = a_result_spotdl_song.result()

        spotify_downloader.progress_handler.downloads_ids_dict[get_song_name(
            spotdl_song)] = spotdl_song.song_id
        spotify_downloader.progress_handler.downloads_dict[spotdl_song.song_id] = self.get_message_handler(
        )

        out_song, path = spotify_downloader.spotdl_downloader.search_and_download(
            a_result_spotdl_song.result())

        logger.info(f"{self.track_id=} {out_song=} {path=} ")

        logger.warning(
            "Should clean downloads_ids_dict and downloads_dict")

        return AResultCode(code=AResultCode.OK, message="OK")

    def download_thread_name(self) -> str:
        """Return a unique thread name for this download."""

        return f"spotify-{self.public_id}"
