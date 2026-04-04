import re
from logging import Logger
from typing import List, Any, Pattern
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.framework.provider.types import AddFromUrlAResult
from backend.core.framework.provider.baseProvider import BaseProvider
from backend.core.framework.downloader.baseDownload import BaseDownload

from backend.core.responses.searchResponse import (
    ArtistSearchResultsItem,
    BaseSearchResultsItem,
)
from backend.core.responses.baseVideoResponse import BaseVideoResponse

from backend.youtube.access.db.ormModels.video import VideoRow

from backend.youtube.framework.video import Video
from backend.youtube.framework.youtube import YouTube
from backend.youtube.framework.download.youtubeDownload import YoutubeDownload
from backend.youtube.framework.youtubeApi import RawYoutubeSearchResult, youtube_api

from backend.youtube.responses.videoResponse import YoutubeVideoResponse

logger: Logger = getLogger(__name__)

YOUTUBE_URL_PATTERNS: list[tuple[Pattern[str], str]] = [
    (
        re.compile(r"https?://(?:www\.)?youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})"),
        "/youtube/video/{}",
    ),
    (
        re.compile(r"https?://(?:www\.)?youtube\.com/shorts/([a-zA-Z0-9_-]{11})"),
        "/youtube/video/{}",
    ),
    (
        re.compile(r"https?://(?:www\.)?youtu\.be/([a-zA-Z0-9_-]{11})"),
        "/youtube/video/{}",
    ),
    (
        re.compile(r"https?://(?:www\.)?youtube\.com/channel/([a-zA-Z0-9_-]{21})"),
        "/youtube/channel/{}",
    ),
    (
        re.compile(r"https?://(?:www\.)?youtube\.com/@([a-zA-Z0-9_-]+)"),
        "/youtube/channel/{}",
    ),
    (
        re.compile(r"https?://(?:www\.)?youtube\.com/playlist\?list=([a-zA-Z0-9_-]+)"),
        "/youtube/playlist/{}",
    ),
]


class YoutubeProvider(BaseProvider):
    """TODO"""

    def __init__(self) -> None:
        super().__init__()

    def set_info(self, provider_id: int, provider_name: str) -> None:
        """TODO"""

        YouTube.provider_name = provider_name
        YouTube.provider = self

        self._id = provider_id
        self._name = provider_name

    async def search_async(self, query: str) -> AResult[List[BaseSearchResultsItem]]:
        """TODO"""

        a_result: AResult[List[RawYoutubeSearchResult]] = (
            await youtube_api.search_videos_async(query=query, max_results=10)
        )
        if a_result.is_not_ok():
            logger.error(f"YouTube search error: {a_result.info()}")
            return AResult(code=AResultCode.GENERAL_ERROR, message="OK")

        videos: List[RawYoutubeSearchResult] = a_result.result()
        result: List[BaseSearchResultsItem] = [
            BaseSearchResultsItem(
                type="video",
                title=v.title or "",
                url=f"/youtube/video/{v.video_id}",
                imageUrl=self._get_thumbnail_url(v.thumbnails),
                artists=[
                    ArtistSearchResultsItem(
                        name=v.channel_title or "",
                        url=f"/youtube/chanel/{v.channel_id}",
                    )
                ],
                provider="Youtube",
            )
            for v in videos
        ]

        return AResult(code=AResultCode.OK, message="OK", result=result)

    def match_url(self, url: str) -> str | None:
        """Check if the URL is a YouTube URL and return the internal path."""
        for pattern, path_template in YOUTUBE_URL_PATTERNS:
            match = pattern.match(url)
            if match:
                return path_template.format(match.group(1))
        return None

    async def add_from_url_async(
        self, session: AsyncSession, url: str
    ) -> AResult[AddFromUrlAResult]:
        """Add a YouTube video from URL to the database."""
        video_id: str | None = None
        for pattern, _ in YOUTUBE_URL_PATTERNS:
            match = pattern.match(url)
            if match:
                video_id = match.group(1)
                break

        if not video_id:
            return AResult(
                code=AResultCode.BAD_REQUEST,
                message="Invalid YouTube URL",
            )

        a_result: AResult[YoutubeVideoResponse] = await YouTube.get_video_async(
            session=session, youtube_id=video_id
        )
        if a_result.is_not_ok():
            return AResult(
                code=a_result.code(),
                message=a_result.message(),
            )

        youtube_video: YoutubeVideoResponse = a_result.result()

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=BaseVideoResponse(
                provider=youtube_video.provider,
                publicId=youtube_video.publicId,
                url=youtube_video.url,
                name=youtube_video.name,
                imageUrl=youtube_video.imageUrl,
                duration_ms=youtube_video.duration_ms,
                artists=youtube_video.artists,
                downloaded=youtube_video.downloaded,
                videoSrc=youtube_video.videoSrc,
                audioSrc=youtube_video.audioSrc,
            ),
        )

    async def start_download_async(
        self,
        session: AsyncSession,
        public_id: str,
        download_id: int,
        download_group_id: int,
        user_id: int,
    ) -> AResult[BaseDownload]:
        """TODO"""

        a_result_video: AResult[VideoRow] = await Video.get_video_from_public_id_async(
            session=session, public_id=public_id
        )
        if a_result_video.is_not_ok():
            logger.error(f"Error getting video from public id {public_id}")
            return AResult(code=a_result_video.code(), message=a_result_video.message())

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=YoutubeDownload(
                public_id=public_id,
                download_id=download_id,
                download_group_id=download_group_id,
                user_id=user_id,
                youtube_url=a_result_video.result().youtube_url,
                youtube_video_id=a_result_video.result().youtube_id,
                video_id=a_result_video.result().id,
            ),
        )

    def _get_thumbnail_url(self, thumbnails: Any) -> str:
        """TODO"""

        if not thumbnails:
            return ""
        thumb_dict: dict[str, Any] = thumbnails
        medium = thumb_dict.get("medium", {})
        high = thumb_dict.get("high", {})
        default = thumb_dict.get("default", {})
        return str(medium.get("url") or high.get("url") or default.get("url") or "")

    async def get_video_async(
        self, session: AsyncSession, public_id: str
    ) -> AResult[BaseVideoResponse]:
        """Get a video by public_id."""

        a_result_video: AResult[VideoRow] = await Video.get_video_from_public_id_async(
            session=session, public_id=public_id
        )
        if a_result_video.is_not_ok():
            logger.error(f"Error getting video from public id {public_id}")
            return AResult(code=a_result_video.code(), message=a_result_video.message())

        video: VideoRow = a_result_video.result()

        a_result: AResult[YoutubeVideoResponse] = await YouTube.get_video_async(
            session=session, youtube_id=video.youtube_id
        )
        if a_result.is_not_ok():
            logger.error(f"Error getting video from YouTube. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        youtube_video: YoutubeVideoResponse = a_result.result()

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=BaseVideoResponse(
                provider=youtube_video.provider,
                publicId=youtube_video.publicId,
                url=youtube_video.url,
                name=youtube_video.name,
                imageUrl=youtube_video.imageUrl or "",
                duration_ms=youtube_video.duration_ms,
                artists=youtube_video.artists,
                downloaded=youtube_video.downloaded,
                videoSrc=youtube_video.videoSrc,
                audioSrc=youtube_video.audioSrc,
            ),
        )


provider = YoutubeProvider()
name = "YouTube"
