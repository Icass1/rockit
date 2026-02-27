import asyncio
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from spotdl.types.song import Song as SpotdlSong  # type: ignore

from backend.constants import SONGS_PATH
from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode

from backend.core.framework.downloader.baseDownload import BaseDownload

from backend.spotify.utils.utils import get_song_name

from backend.spotify.access.trackAccess import TrackAccess
from backend.spotify.access.spotifyAccess import SpotifyAccess
from backend.spotify.access.db.ormModels.track import TrackRow

from backend.spotify.framework.download import spotify_downloader
from backend.spotify.framework.download.spotdl import SpotDL
from backend.spotify.framework.download.messageHandler import MessageHandler

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

        self._message_handler = MessageHandler(
            loop=asyncio.get_event_loop(), download_id=download_id
        )

    def get_message_handler(self) -> MessageHandler:
        """TODO"""

        return self._message_handler

    async def get_spotdl_song_async(self, session: AsyncSession) -> AResult[SpotdlSong]:
        """TODO"""

        a_result_track_row: AResult[TrackRow] = await SpotifyAccess.get_track_id_async(
            session=session, id=self.track_id
        )
        if a_result_track_row.is_not_ok():
            logger.error(f"Error getting track from id. {a_result_track_row.info()}")
            return AResult(
                code=a_result_track_row.code(), message=a_result_track_row.message()
            )

        a_result_spotdl_song: AResult[SpotdlSong] = (
            await SpotDL.get_spotdl_song_from_song_row(
                session=session, track_row=a_result_track_row.result()
            )
        )
        if a_result_spotdl_song.is_not_ok():
            logger.error(
                f"Error getting spotdl song from track. {a_result_spotdl_song.info()}"
            )
            return AResult(
                code=a_result_spotdl_song.code(), message=a_result_spotdl_song.message()
            )

        return AResult(
            code=AResultCode.OK, message="OK", result=a_result_spotdl_song.result()
        )

    async def download_method_async(self, session: AsyncSession) -> AResultCode:
        """Download the Spotify track asynchronously."""

        logger.info("SpotifyDownload.download_method_async")

        a_result_spotdl_song: AResult[SpotdlSong] = await self.get_spotdl_song_async(
            session=session
        )
        if a_result_spotdl_song.is_not_ok():
            logger.error(f"Error getting spotdl song. {a_result_spotdl_song.info()}")
            return AResultCode(
                code=a_result_spotdl_song.code(), message=a_result_spotdl_song.message()
            )

        spotdl_song: SpotdlSong = a_result_spotdl_song.result()

        # Register download in progress.
        song_name: str = get_song_name(song=spotdl_song)
        spotify_downloader.progress_handler.downloads_ids_dict[song_name] = (
            spotdl_song.song_id
        )
        message_handler: MessageHandler = self.get_message_handler()
        message_handler.set_session(session)
        spotify_downloader.progress_handler.downloads_dict[spotdl_song.song_id] = (
            message_handler
        )

        try:
            # Run synchronous download in a thread to avoid blocking asyncio.
            out_song, song_temp_path = await asyncio.to_thread(
                spotify_downloader.spotdl_downloader.search_and_download, spotdl_song
            )
            out_song: SpotdlSong
            song_temp_path: Path | None

            if not song_temp_path:
                logger.error("Search and download failed, path is None.")
                return AResultCode(
                    code=AResultCode.GENERAL_ERROR,
                    message="Search and download failed, path is None.",
                )

            # Prepare destination folder
            songs_path = Path(SONGS_PATH)
            spotify_path = songs_path / "spotify"
            spotify_path.mkdir(parents=True, exist_ok=True)

            relative_path: Path = Path("spotify") / f"{out_song.song_id}.mp3"

            # Move the downloaded file
            target_path: Path = songs_path / relative_path
            song_temp_path.rename(target_path)
            logger.info(f"Moved file to: {target_path}")

            a_result: AResultCode = await TrackAccess.update_track_path_async(
                session,
                track_id=self.track_id,
                path=str(relative_path),
                download_url=out_song.download_url,
            )

            if a_result.is_not_ok():
                logger.error(
                    f"Error updating track path and downoad url. {a_result.info()}"
                )
                return AResultCode(code=a_result.code(), message=a_result.message())

            return AResultCode(code=AResultCode.OK, message="OK")

        except Exception as e:
            logger.error(f"Error downloading song: {e}")
            return AResultCode(
                code=AResultCode.GENERAL_ERROR, message=f"Error downloading song: {e}"
            )

        finally:
            # Clean up dictionaries after download finishes.
            spotify_downloader.progress_handler.downloads_ids_dict.pop(song_name, None)
            spotify_downloader.progress_handler.downloads_dict.pop(
                spotdl_song.song_id, None
            )
            logger.debug("Cleaned downloads_ids_dict and downloads_dict")

    def download_thread_name(self) -> str:
        """Return a unique thread name for this download."""

        return f"spotify-{self.public_id}"
