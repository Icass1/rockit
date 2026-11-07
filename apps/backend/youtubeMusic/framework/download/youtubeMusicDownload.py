import os
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from core.framework.downloader.baseDownload import BaseDownload
from core.framework.objectFiles import ObjectFiles
from logger import getLogger
from result import Result, ResultCode
from youtube.framework.youtubeDownloader import YouTubeDownloader
from youtube.framework.youtubeSearch import (
    YoutubeSearch,
    YoutubeSongQuery,
)
from youtubeMusic.access.db.ormModels.artist import ArtistRow
from youtubeMusic.access.db.ormModels.track import TrackRow
from youtubeMusic.access.youtubeMusicAccess import YoutubeMusicAccess

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

    async def download_method_async(self, session: AsyncSession) -> ResultCode:
        """Download the YouTube Music track as mp3 asynchronously."""

        logger.info(f"Downloading YouTube Music track with ID: {self.youtube_id}")

        try:
            a_result_track: Result[
                TrackRow
            ] = await YoutubeMusicAccess.get_track_by_youtube_id_async(
                session=session, youtube_id=self.youtube_id
            )
            if a_result_track.is_not_ok():
                logger.error(f"Error getting track: {a_result_track.message()}")
                return ResultCode(
                    code=a_result_track.code(),
                    message=f"Error getting track: {a_result_track.message()}",
                )

            track: TrackRow = a_result_track.result()

            a_result_artists: Result[
                list[ArtistRow]
            ] = await YoutubeMusicAccess.get_artists_from_track_async(session=session, track=track)
            artist_names: list[str] = []
            if a_result_artists.is_ok():
                artist_names = [a.name for a in a_result_artists.result()]

            self.title = track.title
            self.artist = ", ".join(artist_names)

            youtube_url: str = (
                self.download_url or f"https://music.youtube.com/watch?v={self.youtube_id}"
            )

            filename: str = f"{self.youtube_id}_{self.download_id}"

            # The selected song ID can itself refer to a videoclip. Resolve the
            # recording first; all retry candidates must pass the same policy.
            source = await YoutubeSearch.find_video_urls_async(
                song=YoutubeSongQuery(
                    title=track.title,
                    artists=artist_names,
                    album_title=track.album.title,
                    duration_ms=track.duration_ms,
                    isrc=track.isrc or "",
                ),
                preferred_url=youtube_url,
                duration_from_preferred=True,
            )
            if source.is_not_ok():
                logger.error("Song source lookup failed: %s", source.info())
                return ResultCode(code=source.code(), message=source.message())
            candidate_urls = source.result()
            youtube_url = candidate_urls[0]
            alternative_urls = candidate_urls[1:]

            a_result_download: Result[
                dict[str, Any]
            ] = await YouTubeDownloader.download_as_mp3_async(
                youtube_url=youtube_url,
                download_id=self.download_id,
                public_id=self.public_id,
                title=track.title,
                artist=", ".join(artist_names),
                filename=filename,
                user_id=self.user_id,
                alternative_urls=alternative_urls,
            )

            if a_result_download.is_not_ok():
                logger.error(f"Download failed: {a_result_download.info()}")
                # Keep the downloader's code: RATE_LIMITED earns the long
                # backoff, NOT_FOUND stops the retries altogether.
                return ResultCode(
                    code=a_result_download.code(),
                    message=f"Download failed: {a_result_download.message()}",
                )

            downloaded_result: dict[str, Any] = a_result_download.result()
            downloaded_filename: str = downloaded_result["filepath"]

            logger.info(f"Track downloaded successfully: {downloaded_filename}")

            object_key = f"youtubeMusic/{self.youtube_id}.mp3"

            uploaded = await ObjectFiles.upload_async(
                session=session, source=downloaded_filename, key=object_key
            )
            if uploaded.is_not_ok():
                return ResultCode(code=uploaded.code(), message=uploaded.message())
            os.remove(downloaded_filename)

            await YoutubeMusicAccess.update_track_path_async(
                session=session, track_id=self.track_id, storage_object_id=uploaded.result().id
            )

            return ResultCode(code=ResultCode.OK, message="Download completed.")

        except Exception as e:
            logger.error(f"Error in download_method_async: {e}", exc_info=True)
            return ResultCode(code=ResultCode.GENERAL_ERROR, message=f"Download error: {e}")
