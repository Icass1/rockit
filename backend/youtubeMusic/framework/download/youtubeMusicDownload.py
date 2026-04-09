import os
import shutil
from typing import Any, Dict, List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.constants import MEDIA_PATH
from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.framework.downloader.baseDownload import BaseDownload
from backend.core.framework.downloader.types import DownloadStatus

from backend.youtubeMusic.access.db.ormModels.track import TrackRow
from backend.youtubeMusic.access.db.ormModels.artist import ArtistRow
from backend.youtubeMusic.access.youtubeMusicAccess import YoutubeMusicAccess

from backend.youtube.framework.youtubeDownloader import YouTubeDownloader

logger = getLogger(__name__)


class YoutubeMusicDownload(BaseDownload):
    track_id: int
    youtube_id: str
    download_url: str | None

    def __init__(
        self,
        public_id: str,
        download_id: int,
        download_group_id: int,
        user_id: int,
        track_id: int,
        youtube_id: str,
        download_url: str | None,
    ) -> None:
        super().__init__(
            public_id=public_id,
            download_id=download_id,
            download_group_id=download_group_id,
            user_id=user_id,
        )
        self.track_id = track_id
        self.youtube_id = youtube_id
        self.download_url = download_url

    async def download_method_async(self, session: AsyncSession) -> AResultCode:
        """Download the YouTube Music track as mp3 asynchronously."""

        logger.info(f"Downloading YouTube Music track with ID: {self.youtube_id}")

        try:
            a_result_track: AResult[TrackRow] = (
                await YoutubeMusicAccess.get_track_by_youtube_id_async(
                    session=session, youtube_id=self.youtube_id
                )
            )
            if a_result_track.is_not_ok():
                logger.error(f"Error getting track: {a_result_track.message()}")
                return AResultCode(
                    code=a_result_track.code(),
                    message=f"Error getting track: {a_result_track.message()}",
                )

            track: TrackRow = a_result_track.result()

            a_result_artists: AResult[List[ArtistRow]] = (
                await YoutubeMusicAccess.get_artists_from_track_async(
                    session=session, track=track
                )
            )
            artist_names: List[str] = []
            if a_result_artists.is_ok():
                artist_names = [a.name for a in a_result_artists.result()]

            youtube_url: str = (
                self.download_url
                or f"https://music.youtube.com/watch?v={self.youtube_id}"
            )

            filename: str = f"{self.youtube_id}_{self.download_id}"

            async def _progress_callback(progress: float, status: DownloadStatus):
                await self.progress_callback(progress=progress, status=status)

            a_result_download: AResult[Dict[str, Any]] = (
                await YouTubeDownloader.download_as_mp3_async(
                    youtube_url=youtube_url,
                    download_id=self.download_id,
                    public_id=self.public_id,
                    title=track.title,
                    artist=", ".join(artist_names),
                    filename=filename,
                    user_id=self.user_id,
                    progress_callback=_progress_callback,
                )
            )

            if a_result_download.is_not_ok():
                logger.error(f"Download failed: {a_result_download.message()}")
                return AResultCode(
                    code=AResultCode.GENERAL_ERROR,
                    message=f"Download failed: {a_result_download.message()}",
                )

            downloaded_result: Dict[str, Any] = a_result_download.result()
            downloaded_filename: str = downloaded_result["filepath"]

            logger.info(f"Track downloaded successfully: {downloaded_filename}")

            final_relative_dir: str = os.path.join("youtubeMusic")
            final_dir: str = os.path.join(MEDIA_PATH, "youtubeMusic")
            final_path: str = os.path.join(final_dir, f"{self.youtube_id}.mp3")
            final_relative_path: str = os.path.join(
                final_relative_dir, f"{self.youtube_id}.mp3"
            )
            os.makedirs(final_dir, exist_ok=True)

            shutil.move(downloaded_filename, final_path)

            await YoutubeMusicAccess.update_track_path_async(
                session=session, track_id=self.track_id, path=final_relative_path
            )

            return AResultCode(code=AResultCode.OK, message="Download completed.")

        except Exception as e:
            logger.error(f"Error in download_method_async: {e}", exc_info=True)
            return AResultCode(
                code=AResultCode.GENERAL_ERROR, message=f"Download error: {e}"
            )
