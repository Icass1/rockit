import os
import shutil
from sqlalchemy.ext.asyncio import AsyncSession

from backend.constants import MEDIA_PATH
from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode

from backend.core.framework.downloader.baseDownload import BaseDownload

from backend.youtube.framework.video import Video
from backend.youtube.framework.youtubeDownloader import YouTubeDownloader

logger = getLogger(__name__)


class YoutubeDownload(BaseDownload):
    youtube_url: str
    youtube_video_id: str
    video_id: int

    def __init__(
        self,
        public_id: str,
        download_id: int,
        download_group_id: int,
        user_id: int,
        youtube_url: str,
        youtube_video_id: str,
        video_id: int,
    ) -> None:
        """Create a YoutubeDownload for a single video."""

        super().__init__(
            public_id=public_id,
            download_id=download_id,
            download_group_id=download_group_id,
            user_id=user_id,
        )
        self.youtube_url = youtube_url
        self.youtube_video_id = youtube_video_id
        self.video_id = video_id

    async def download_method_async(self, session: AsyncSession) -> AResultCode:
        """Download the Youtube video asynchronously."""

        logger.info(f"Downloading Youtube video with URL: {self.youtube_url}")

        try:
            a_result_video = await Video.get_video_from_public_id_async(
                session=session, public_id=self.public_id
            )
            video_title = self.public_id
            video_artist = ""
            if a_result_video.is_ok():
                video = a_result_video.result()
                video_title = video.name or self.public_id
                if video.channel_id:
                    from backend.youtube.access.youtubeAccess import YouTubeAccess

                    a_result_channel = await YouTubeAccess.get_channel_id_async(
                        session=session, id=video.channel_id
                    )
                    if a_result_channel.is_ok():
                        video_artist = a_result_channel.result().name or ""

            filename: str = f"{self.youtube_video_id}_{self.download_id}"

            a_result_download: AResult[str] = (
                await YouTubeDownloader.download_as_mp4_async(
                    youtube_url=self.youtube_url,
                    download_id=self.download_id,
                    public_id=self.public_id,
                    title=video_title,
                    artist=video_artist,
                    filename=filename,
                    user_id=self.user_id,
                )
            )

            if a_result_download.is_not_ok():
                logger.error(f"Download failed: {a_result_download.message()}")
                return AResultCode(
                    code=AResultCode.GENERAL_ERROR,
                    message=f"Download failed: {a_result_download.message()}",
                )

            downloaded_filename: str = a_result_download.result()

            logger.info(f"Video downloaded successfully: {downloaded_filename}")

            final_relative_dir: str = os.path.join("youtube")
            final_dir: str = os.path.join(MEDIA_PATH, "youtube")
            final_path: str = os.path.join(final_dir, f"{self.youtube_video_id}.mp4")
            final_relative_path: str = os.path.join(
                final_relative_dir, f"{self.youtube_video_id}.mp4"
            )
            os.makedirs(final_dir, exist_ok=True)

            shutil.move(downloaded_filename, final_path)

            try:
                a_result_update: AResultCode = await Video.update_video_path_async(
                    session=session,
                    video_id=self.video_id,
                    video_path=final_relative_path,
                )

                if a_result_update.is_not_ok():
                    logger.warning(
                        f"Could not update video path in DB: {a_result_update.message()}"
                    )
            except Exception as e:
                logger.warning(f"Could not update video path in DB: {e}")

            return AResultCode(code=AResultCode.OK, message="Download completed.")

        except Exception as e:
            logger.error(f"Error in download_method_async: {e}", exc_info=True)
            return AResultCode(
                code=AResultCode.GENERAL_ERROR, message=f"Download error: {e}"
            )
