import os
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from core.framework.downloader.baseDownload import BaseDownload
from core.framework.objectFiles import ObjectFiles
from logger import getLogger
from result import Result, ResultCode
from youtube.framework.video import Video
from youtube.framework.youtubeDownloader import YouTubeDownloader

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

    async def download_method_async(self, session: AsyncSession) -> ResultCode:
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
                    from youtube.access.youtubeAccess import YouTubeAccess

                    a_result_channel = await YouTubeAccess.get_channel_id_async(
                        session=session, id=video.channel_id
                    )
                    if a_result_channel.is_ok():
                        video_artist = a_result_channel.result().name or ""

            self.title = video_title
            self.artist = video_artist
            filename: str = f"{self.youtube_video_id}_{self.download_id}"

            a_result_download: Result[
                dict[str, Any]
            ] = await YouTubeDownloader.download_as_mp4_async(
                youtube_url=self.youtube_url,
                download_id=self.download_id,
                public_id=self.public_id,
                title=video_title,
                artist=video_artist,
                filename=filename,
                user_id=self.user_id,
            )

            if a_result_download.is_not_ok():
                logger.error(f"Download failed: {a_result_download.message()}")
                return ResultCode(
                    code=a_result_download.code(),
                    message=f"Download failed: {a_result_download.message()}",
                )

            downloaded_result: dict[str, Any] = a_result_download.result()
            downloaded_filename: str = downloaded_result["filepath"]
            real_duration_ms: int | None = downloaded_result.get("duration_ms")

            logger.info(f"Video downloaded successfully: {downloaded_filename}")

            _, actual_ext = os.path.splitext(downloaded_filename)
            object_key = f"youtube/{self.youtube_video_id}{actual_ext}"

            uploaded = await ObjectFiles.upload_async(
                session=session, source=downloaded_filename, key=object_key
            )
            if uploaded.is_not_ok():
                return ResultCode(code=uploaded.code(), message=uploaded.message())
            os.remove(downloaded_filename)

            try:
                a_result_update: ResultCode = await Video.update_video_path_async(
                    session=session,
                    video_id=self.video_id,
                    storage_object_id=uploaded.result().id,
                )

                if a_result_update.is_not_ok():
                    logger.warning(
                        f"Could not update video path in DB: {a_result_update.message()}"
                    )

                if real_duration_ms is not None:
                    a_result_duration: ResultCode = await Video.update_video_real_duration_async(
                        session=session,
                        video_id=self.video_id,
                        real_duration_ms=real_duration_ms,
                    )
                    if a_result_duration.is_not_ok():
                        logger.warning(
                            f"Could not update video real duration in DB: "
                            f"{a_result_duration.message()}"
                        )
            except Exception as e:
                logger.warning(f"Could not update video in DB: {e}")

            return ResultCode(code=ResultCode.OK, message="Download completed.")

        except Exception as e:
            logger.error(f"Error in download_method_async: {e}", exc_info=True)
            return ResultCode(code=ResultCode.GENERAL_ERROR, message=f"Download error: {e}")
