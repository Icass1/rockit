import os
import re
from logging import Logger
from typing import List, Any
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.utils.backendUtils import time_it

from backend.core.aResult import AResult, AResultCode

from backend.core.framework.provider.types import AddFromUrlAResult
from backend.core.framework.provider.baseMediaProvider import BaseMediaProvider
from backend.core.framework.downloader.baseDownload import BaseDownload
from backend.core.framework.models.urlPattern import UrlPattern

from backend.core.responses.searchResponse import (
    ArtistSearchResultsItem,
    BaseSearchResultsItem,
)
from backend.core.responses.baseVideoResponse import BaseVideoResponse

from backend.youtube.access.db.ormModels.video import VideoRow
from backend.youtube.access.youtubeAccess import YouTubeAccess

from backend.youtube.framework.video import Video
from backend.youtube.framework.youtube import YouTube
from backend.youtube.framework.download.youtubeDownload import YoutubeDownload
from backend.youtube.framework.youtubeApi import RawYoutubeSearchResult, youtube_api

from backend.youtube.responses.videoResponse import YoutubeVideoResponse
from backend.constants import MEDIA_PATH

logger: Logger = getLogger(__name__)

YOUTUBE_URL_PATTERNS: list[UrlPattern] = [
    UrlPattern(
        pattern=re.compile(
            r"https?://(?:www\.)?youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})"
        ),
        path_template="/youtube/video/{}",
    ),
    UrlPattern(
        pattern=re.compile(
            r"https?://(?:www\.)?youtube\.com/shorts/([a-zA-Z0-9_-]{11})"
        ),
        path_template="/youtube/video/{}",
    ),
    UrlPattern(
        pattern=re.compile(r"https?://(?:www\.)?youtu\.be/([a-zA-Z0-9_-]{11})"),
        path_template="/youtube/video/{}",
    ),
    UrlPattern(
        pattern=re.compile(
            r"https?://(?:www\.)?youtube\.com/channel/([a-zA-Z0-9_-]{21})"
        ),
        path_template="/youtube/channel/{}",
    ),
    UrlPattern(
        pattern=re.compile(r"https?://(?:www\.)?youtube\.com/@([a-zA-Z0-9_-]+)"),
        path_template="/youtube/channel/{}",
    ),
    UrlPattern(
        pattern=re.compile(
            r"https?://(?:www\.)?youtube\.com/playlist\?list=([a-zA-Z0-9_-]+)"
        ),
        path_template="/youtube/playlist/{}",
    ),
]


class YoutubeProvider(BaseMediaProvider):
    """TODO"""

    def __init__(self) -> None:
        super().__init__()

    def set_info(self, provider_id: int, provider_name: str) -> None:
        """TODO"""

        YouTube.provider_name = provider_name
        YouTube.provider = self

        self._id = provider_id
        self._name = provider_name

    @time_it
    async def search_media_async(
        self, session: AsyncSession, query: str
    ) -> AResult[List[BaseSearchResultsItem]]:
        """TODO"""

        a_result: AResult[List[RawYoutubeSearchResult]] = (
            await youtube_api.search_videos_async(query=query, max_results=10)
        )
        if a_result.is_not_ok():
            logger.error(f"YouTube search error: {a_result.info()}")
            return AResult(code=AResultCode.GENERAL_ERROR, message="OK")

        videos: List[RawYoutubeSearchResult] = a_result.result()

        youtube_ids: List[str] = [v.video_id for v in videos if v.video_id is not None]
        downloaded_ids: set[str] = await YouTubeAccess.get_downloaded_youtube_ids_async(
            session=session, youtube_ids=youtube_ids
        )

        result: List[BaseSearchResultsItem] = [
            BaseSearchResultsItem(
                type="video",
                name=v.title or "",
                providerUrl=f"https://www.youtube.com/watch?v={v.video_id}",
                imageUrl=self._get_thumbnail_url(v.thumbnails),
                artists=[
                    ArtistSearchResultsItem(
                        name=v.channel_title or "",
                        url=f"/youtube/chanel/{v.channel_id}",
                    )
                ],
                provider=self._name,
                downloaded=v.video_id in downloaded_ids,
                url=None,
            )
            for v in videos
        ]

        return AResult(code=AResultCode.OK, message="OK", result=result)

    def match_url(self, url: str) -> str | None:
        """Check if the URL is a YouTube URL and return the internal path."""
        for up in YOUTUBE_URL_PATTERNS:
            match = up.pattern.match(url)
            if match:
                return up.path_template.format(match.group(1))
        return None

    async def add_from_url_async(
        self, session: AsyncSession, url: str
    ) -> AResult[AddFromUrlAResult]:
        """Add a YouTube video from URL to the database."""
        video_id: str | None = None
        for up in YOUTUBE_URL_PATTERNS:
            match = up.pattern.match(url)
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
                providerUrl=youtube_video.providerUrl,
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

    @time_it
    async def get_videos_async(
        self, session: AsyncSession, public_ids: List[str]
    ) -> AResult[List[BaseVideoResponse]]:
        """Get videos by public_ids."""

        results: List[BaseVideoResponse] = []
        for public_id in public_ids:
            a_result_video: AResult[VideoRow] = (
                await Video.get_video_from_public_id_async(
                    session=session, public_id=public_id
                )
            )
            if a_result_video.is_not_ok():
                logger.error(f"Error getting video from public id {public_id}")
                continue

            video: VideoRow = a_result_video.result()

            a_result: AResult[YoutubeVideoResponse] = await YouTube.get_video_async(
                session=session, youtube_id=video.youtube_id
            )
            if a_result.is_not_ok():
                logger.error(f"Error getting video from YouTube. {a_result.info()}")
                continue

            youtube_video: YoutubeVideoResponse = a_result.result()

            results.append(
                BaseVideoResponse(
                    provider=youtube_video.provider,
                    publicId=youtube_video.publicId,
                    providerUrl=youtube_video.providerUrl,
                    name=youtube_video.name,
                    imageUrl=youtube_video.imageUrl or "",
                    duration_ms=youtube_video.duration_ms,
                    artists=youtube_video.artists,
                    downloaded=youtube_video.downloaded,
                    videoSrc=youtube_video.videoSrc,
                    audioSrc=youtube_video.audioSrc,
                )
            )

        return AResult(code=AResultCode.OK, message="OK", result=results)

    def get_stats_media_info_cte_fragment(self) -> str | None:
        from backend.core.enums.mediaTypeEnum import MediaTypeEnum

        return f"""    SELECT v.id                                           AS media_id,
           COALESCE(v.real_duration_ms, v.duration_ms)   AS duration_ms,
           cm.public_id                                   AS public_id,
           v.name                                         AS media_name,
           ci.url                                         AS image_url,
           {MediaTypeEnum.VIDEO.value}                    AS media_type_key
    FROM   youtube.video v
    JOIN   core.media    cm ON cm.id = v.id
    JOIN   core.image    ci ON ci.id = v.image_id"""

    def get_stats_artist_info_cte_fragment(self) -> str | None:
        return """    SELECT v.id               AS media_id,
           cm_ch.public_id    AS artist_public_id,
           ch.name            AS artist_name,
           ci.url             AS artist_image_url
    FROM   youtube.video         v
    JOIN   youtube.video_channel vc    ON vc.video_id   = v.id
    JOIN   youtube.channel       ch    ON ch.id         = vc.channel_id
    JOIN   core.media            cm_ch ON cm_ch.id      = ch.id
    JOIN   core.image            ci    ON ci.id         = ch.image_id"""

    async def get_media_duration_ms_async(
        self, session: AsyncSession, public_id: str
    ) -> AResult[int]:
        """Get the duration of a YouTube video in milliseconds."""
        a_result_video: AResult[VideoRow] = await Video.get_video_from_public_id_async(
            session=session, public_id=public_id
        )
        if a_result_video.is_not_ok():
            return AResult(code=a_result_video.code(), message=a_result_video.message())

        video: VideoRow = a_result_video.result()
        duration_ms = (
            video.real_duration_ms if video.real_duration_ms else video.duration_ms or 0
        )

        return AResult(code=AResultCode.OK, message="OK", result=duration_ms)

    async def delete_media_async(
        self, session: AsyncSession, public_id: str
    ) -> AResultCode:
        """Remove the media files for a YouTube video and reset its paths in the database."""

        a_result_video: AResult[VideoRow] = await Video.get_video_from_public_id_async(
            session=session, public_id=public_id
        )
        if a_result_video.is_not_ok():
            logger.error(
                f"Error getting video for public id {public_id}. {a_result_video.info()}"
            )
            return AResultCode(
                code=a_result_video.code(), message=a_result_video.message()
            )

        video: VideoRow = a_result_video.result()

        if video.video_path:
            full_video_path: str = os.path.join(MEDIA_PATH, video.video_path)
            self._rename_file_to_backup(full_video_path)

        a_result_clear: AResultCode = await Video.clear_video_paths_async(
            session=session, video_id=video.id
        )
        if a_result_clear.is_not_ok():
            logger.error(f"Error clearing video paths. {a_result_clear.info()}")
            return AResultCode(
                code=a_result_clear.code(), message=a_result_clear.message()
            )

        return AResultCode(code=AResultCode.OK, message="OK")

    async def get_frame_async(
        self,
        session: AsyncSession,
        public_id: str,
        timestamp_ms: float,
    ) -> AResult[bytes]:
        """Extract a single frame from a YouTube video at the given timestamp (ms)."""

        a_result_video: AResult[VideoRow] = await Video.get_video_from_public_id_async(
            session=session, public_id=public_id
        )
        if a_result_video.is_not_ok():
            logger.error(
                f"Error getting video for public id {public_id}. {a_result_video.info()}"
            )
            return AResult(code=a_result_video.code(), message=a_result_video.message())

        video: VideoRow = a_result_video.result()

        if not video.video_path:
            logger.error(f"Video {public_id} has no downloaded file.")
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="Video has not been downloaded yet",
            )

        return await YouTube.get_frame_async(
            video_path=video.video_path,
            public_id=public_id,
            timestamp_ms=timestamp_ms,
        )


provider = YoutubeProvider()
name = "YouTube"
