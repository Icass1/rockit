import uuid
from typing import TYPE_CHECKING, Any

import requests as req
from sqlalchemy.ext.asyncio import AsyncSession

from constants import BACKEND_URL
from core.access.db.ormModels.image import ImageRow
from core.access.db.ormModels.media import CoreMediaRow
from core.access.mediaAccess import MediaAccess
from core.framework.media.image import Image
from core.responses.baseArtistResponse import BaseArtistResponse
from logger import getLogger
from result import Result, ResultCode
from youtube.access.db.ormModels.channel import ChannelRow
from youtube.access.db.ormModels.video import VideoRow
from youtube.access.youtubeAccess import YouTubeAccess
from youtube.framework.youtubeApi import youtube_api
from youtube.responses.channelResponse import YoutubeChannelResponse
from youtube.responses.videoResponse import YoutubeVideoResponse
from youtube.youtubeApiTypes.rawYoutubeApiChannel import RawYoutubeChannel
from youtube.youtubeApiTypes.rawYoutubeApiVideo import RawYoutubeVideo

if TYPE_CHECKING:
    from youtube.framework.provider.yotubeProvider import YoutubeProvider


logger = getLogger(__name__)


class YouTube:
    provider: "YoutubeProvider"
    provider_name: str

    @staticmethod
    async def _download_and_create_internal_image(
        session: AsyncSession,
        url: str,
    ) -> Result[ImageRow]:
        """Download an image from a URL, save it locally, and create an ImageRow."""

        try:
            response = req.get(url, timeout=10)
            if response.status_code != 200:
                return Result(code=ResultCode.GENERAL_ERROR, message="Image download failed")
            filename = str(uuid.uuid4()) + ".jpg"
            key = f"images/youtube/{filename}"
            return await Image.ensure_image_from_bytes_async(
                session=session,
                key=key,
                data=response.content,
                filename=filename,
                content_type=response.headers.get("Content-Type"),
            )
        except Exception as e:
            logger.error(f"Failed to download/create internal image: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to download/create internal image: {e}",
            )

    @staticmethod
    async def get_video_async(
        session: AsyncSession, youtube_id: str
    ) -> Result[YoutubeVideoResponse]:
        """Get a video by ID, fetching from YouTube API and populating the database if not found."""

        a_result_video: Result[VideoRow] = await YouTubeAccess.get_video_youtube_id_async(
            session=session, youtube_id=youtube_id
        )
        if a_result_video.is_ok():
            video_row: VideoRow = a_result_video.result()

            a_result_core_video: Result[CoreMediaRow] = await MediaAccess.get_media_from_id_async(
                session, id=video_row.id
            )
            if a_result_core_video.is_not_ok():
                logger.error(f"Error getting core video. {a_result_core_video.info()}")
                return Result(
                    code=a_result_core_video.code(),
                    message=a_result_core_video.message(),
                )

            core_video: CoreMediaRow = a_result_core_video.result()

            a_result_channel: Result[ChannelRow] = await YouTubeAccess.get_channel_id_async(
                session=session, id=video_row.channel_id
            )
            channel: ChannelRow | None = (
                a_result_channel.result() if a_result_channel.is_ok() else None
            )

            a_result_internal_image: Result[ImageRow] = await MediaAccess.get_image_from_id_async(
                session=session, id=video_row.image_id
            )
            if a_result_internal_image.is_not_ok():
                logger.error(f"Error getting video image. {a_result_internal_image.info()}")
                return Result(
                    code=a_result_internal_image.code(),
                    message=a_result_internal_image.message(),
                )

            a_result_image_url: Result[str] = await Image.get_internal_image_url_async(
                image=a_result_internal_image.result()
            )
            if a_result_image_url.is_not_ok():
                logger.error(f"Error getting video image URL. {a_result_image_url.info()}")
                return Result[YoutubeVideoResponse].from_result(a_result_image_url)

            image_url: str = a_result_image_url.result()
            dominant_color: str = a_result_internal_image.result().dominant_color

            channel_response: YoutubeChannelResponse | None = None
            channel_dominant_color: str = ""
            if channel:
                a_result_channel_image: Result[
                    ImageRow
                ] = await MediaAccess.get_image_from_id_async(session, id=channel.image_id)
                if a_result_channel_image.is_not_ok():
                    logger.error(f"Error getting channel image. {a_result_channel_image.info()}")
                    return Result(
                        code=a_result_channel_image.code(),
                        message=a_result_channel_image.message(),
                    )

                a_result_channel_image_url: Result[str] = await Image.get_internal_image_url_async(
                    image=a_result_channel_image.result()
                )
                if a_result_channel_image_url.is_not_ok():
                    logger.error(
                        f"Error getting channel image URL. {a_result_channel_image_url.info()}"
                    )
                    return Result[YoutubeVideoResponse].from_result(a_result_channel_image_url)

                channel_dominant_color = a_result_channel_image.result().dominant_color

                channel_response = YoutubeChannelResponse(
                    provider=YouTube.provider_name,
                    publicId=channel.youtube_id,
                    name=channel.name,
                    imageUrl=a_result_channel_image_url.result(),
                    subscriberCount=channel.subscriber_count,
                    videoCount=channel.video_count,
                    viewCount=channel.view_count,
                    description=channel.description,
                )

            tags: list[str] = []
            if video_row.tags:
                tags = video_row.tags.split(",")

            artists: list[BaseArtistResponse] = []
            if channel_response:
                artists = [
                    BaseArtistResponse(
                        provider=channel_response.provider,
                        publicId=channel_response.publicId,
                        url=f"https://www.youtube.com/channel/{channel_response.publicId}",
                        providerUrl=f"https://www.youtube.com/channel/{channel_response.publicId}",
                        name=channel_response.name,
                        imageUrl=channel_response.imageUrl or "",
                        dominantColor=channel_dominant_color,
                    )
                ]

            is_downloaded: bool = video_row.video_path is not None

            video_src: str | None = None
            audio_src: str | None = None

            if video_row.video_path:
                video_src = f"/youtube/video/{video_row.youtube_id}/stream"
                audio_src = f"/youtube/video/{video_row.youtube_id}/stream/audio"

            return Result(
                code=ResultCode.OK,
                message="OK",
                result=YoutubeVideoResponse(
                    provider=YouTube.provider_name,
                    publicId=core_video.public_id,
                    providerUrl=video_row.youtube_url or "",
                    youtubeId=video_row.youtube_id,
                    name=video_row.name,
                    duration_ms=(
                        video_row.real_duration_ms
                        if video_row.real_duration_ms
                        else video_row.duration_ms
                    ),
                    viewCount=video_row.view_count,
                    likeCount=video_row.like_count,
                    commentCount=video_row.comment_count,
                    imageUrl=image_url,
                    dominantColor=dominant_color,
                    artists=artists,
                    channel=channel_response,
                    description=video_row.description,
                    youtubeUrl=video_row.youtube_url,
                    tags=tags,
                    publishedAt=video_row.published_at,
                    video_path=video_row.video_path,
                    downloaded=is_downloaded,
                    videoUrl=BACKEND_URL + video_src if video_src else None,
                    audioUrl=BACKEND_URL + audio_src if audio_src else None,
                ),
            )

        if a_result_video.code() != ResultCode.NOT_FOUND:
            logger.error(f"Error getting video. {a_result_video.info()}")
            return Result(code=a_result_video.code(), message=a_result_video.message())

        a_result_api_video: Result[RawYoutubeVideo] = await youtube_api.get_video_async(youtube_id)
        if a_result_api_video.is_not_ok():
            logger.error(f"Error getting video from YouTube API. {a_result_api_video.info()}")
            return Result(code=a_result_api_video.code(), message=a_result_api_video.message())

        raw_video: RawYoutubeVideo = a_result_api_video.result()

        snippet: dict[str, Any] = raw_video.snippet or {}
        channel_id: str = snippet.get("channelId", "")

        a_result_api_channel: Result[RawYoutubeChannel] = await youtube_api.get_channel_async(
            channel_id
        )
        if a_result_api_channel.is_not_ok():
            logger.error(f"Error getting channel from YouTube API. {a_result_api_channel.info()}")
            return Result(code=a_result_api_channel.code(), message=a_result_api_channel.message())

        raw_channel: RawYoutubeChannel = a_result_api_channel.result()

        a_result_provider_id: Result[int] = YouTube.provider.get_id()
        if a_result_provider_id.is_not_ok():
            logger.error(f"Error getting provider id. {a_result_provider_id.info()}")
            return Result(code=a_result_provider_id.code(), message=a_result_provider_id.message())

        provider_id: int = a_result_provider_id.result()

        try:
            channel_snippet: dict[str, Any] = raw_channel.snippet or {}
            channel_thumbnails: dict[str, Any] = channel_snippet.get("thumbnails", {})
            channel_thumbnail_url: str = ""
            if "high" in channel_thumbnails:
                channel_thumbnail_url = channel_thumbnails["high"].get("url", "")
            elif "medium" in channel_thumbnails:
                channel_thumbnail_url = channel_thumbnails["medium"].get("url", "")
            elif "default" in channel_thumbnails:
                channel_thumbnail_url = channel_thumbnails["default"].get("url", "")

            channel_image_id: int | None = None
            if channel_thumbnail_url:
                a_img = await YouTube._download_and_create_internal_image(
                    session, channel_thumbnail_url
                )
                if a_img.is_ok():
                    channel_image_id = a_img.result().id

            a_result_channel_row: Result[ChannelRow] = await YouTubeAccess.get_or_create_channel(
                session,
                raw=raw_channel,
                provider_id=provider_id,
                image_id=channel_image_id,
            )
            if a_result_channel_row.is_not_ok():
                return Result(
                    code=a_result_channel_row.code(),
                    message=a_result_channel_row.message(),
                )

            channel_row: ChannelRow = a_result_channel_row.result()

            video_snippet: dict[str, Any] = raw_video.snippet or {}
            video_thumbnails: dict[str, Any] = video_snippet.get("thumbnails", {})
            video_thumbnail_url: str = ""
            if "high" in video_thumbnails:
                video_thumbnail_url = video_thumbnails["high"].get("url", "")
            elif "medium" in video_thumbnails:
                video_thumbnail_url = video_thumbnails["medium"].get("url", "")
            elif "default" in video_thumbnails:
                video_thumbnail_url = video_thumbnails["default"].get("url", "")

            video_image_id: int | None = None
            if video_thumbnail_url:
                a_img = await YouTube._download_and_create_internal_image(
                    session, video_thumbnail_url
                )
                if a_img.is_ok():
                    video_image_id = a_img.result().id

            a_result_video_row: Result[VideoRow] = await YouTubeAccess.get_or_create_video(
                session,
                raw=raw_video,
                channel_id=channel_row.id,
                provider_id=provider_id,
                image_id=video_image_id,
            )
            if a_result_video_row.is_not_ok():
                return Result(
                    code=a_result_video_row.code(),
                    message=a_result_video_row.message(),
                )

            video_row = a_result_video_row.result()

        except Exception as e:
            logger.error(f"Failed to populate video in DB: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to populate video in DB: {e}",
            )

        a_result_core_video: Result[CoreMediaRow] = await MediaAccess.get_media_from_id_async(
            session, id=video_row.id
        )
        if a_result_core_video.is_not_ok():
            logger.error(f"Error getting core video. {a_result_core_video.info()}")
            return Result(code=a_result_core_video.code(), message=a_result_core_video.message())

        core_video: CoreMediaRow = a_result_core_video.result()

        a_result_fetched_channel: Result[
            ChannelRow
        ] = await YouTubeAccess.get_channel_youtube_id_async(session=session, youtube_id=channel_id)
        fetched_channel: ChannelRow | None = (
            a_result_fetched_channel.result() if a_result_fetched_channel.is_ok() else None
        )

        a_result_internal_image: Result[ImageRow] = await MediaAccess.get_image_from_id_async(
            session=session, id=video_row.image_id
        )
        if a_result_internal_image.is_not_ok():
            logger.error(f"Error getting video image. {a_result_internal_image.info()}")
            return Result(
                code=a_result_internal_image.code(),
                message=a_result_internal_image.message(),
            )

        a_result_image_url: Result[str] = await Image.get_internal_image_url_async(
            image=a_result_internal_image.result()
        )
        if a_result_image_url.is_not_ok():
            logger.error(f"Error getting video image URL. {a_result_image_url.info()}")
            return Result[YoutubeVideoResponse].from_result(a_result_image_url)

        image_url: str = a_result_image_url.result()
        dominant_color: str = a_result_internal_image.result().dominant_color

        channel_response: YoutubeChannelResponse | None = None
        channel_dominant_color: str = ""
        if fetched_channel:
            a_result_channel_image: Result[ImageRow] = await MediaAccess.get_image_from_id_async(
                session, id=fetched_channel.image_id
            )
            if a_result_channel_image.is_not_ok():
                logger.error(f"Error getting channel image. {a_result_channel_image.info()}")
                return Result(
                    code=a_result_channel_image.code(),
                    message=a_result_channel_image.message(),
                )

            a_result_channel_image_url: Result[str] = await Image.get_internal_image_url_async(
                image=a_result_channel_image.result()
            )
            if a_result_channel_image_url.is_not_ok():
                logger.error(
                    f"Error getting channel image URL. {a_result_channel_image_url.info()}"
                )
                return Result[YoutubeVideoResponse].from_result(a_result_channel_image_url)

            channel_dominant_color = a_result_channel_image.result().dominant_color

            channel_response = YoutubeChannelResponse(
                provider=YouTube.provider_name,
                publicId=fetched_channel.youtube_id,
                name=fetched_channel.name,
                imageUrl=a_result_channel_image_url.result(),
                subscriberCount=fetched_channel.subscriber_count,
                videoCount=fetched_channel.video_count,
                viewCount=fetched_channel.view_count,
                description=fetched_channel.description,
            )

        tags: list[str] = []
        if video_row.tags:
            tags = video_row.tags.split(",")

        artists: list[BaseArtistResponse] = []
        if channel_response:
            artists = [
                BaseArtistResponse(
                    provider=channel_response.provider,
                    publicId=channel_response.publicId,
                    url=f"https://www.youtube.com/channel/{channel_response.publicId}",
                    providerUrl=f"https://www.youtube.com/channel/{channel_response.publicId}",
                    name=channel_response.name,
                    imageUrl=channel_response.imageUrl or "",
                    dominantColor=channel_dominant_color,
                )
            ]

        is_downloaded: bool = video_row.video_path is not None

        video_src: str | None = None
        audio_src: str | None = None
        if video_row.video_path:
            video_src = f"/youtube/video/{video_row.youtube_id}/stream"
            audio_src = f"/youtube/video/{video_row.youtube_id}/stream/audio"

        return Result(
            code=ResultCode.OK,
            message="OK",
            result=YoutubeVideoResponse(
                provider=YouTube.provider_name,
                publicId=core_video.public_id,
                providerUrl=video_row.youtube_url or "",
                youtubeId=video_row.youtube_id,
                name=video_row.name,
                duration_ms=(
                    video_row.real_duration_ms
                    if video_row.real_duration_ms
                    else video_row.duration_ms
                ),
                viewCount=video_row.view_count,
                likeCount=video_row.like_count,
                commentCount=video_row.comment_count,
                imageUrl=image_url,
                dominantColor=dominant_color,
                artists=artists,
                channel=channel_response,
                description=video_row.description,
                youtubeUrl=video_row.youtube_url,
                tags=tags,
                publishedAt=video_row.published_at,
                video_path=video_row.video_path,
                downloaded=is_downloaded,
                videoUrl=BACKEND_URL + video_src if video_src else None,
                audioUrl=BACKEND_URL + audio_src if audio_src else None,
            ),
        )

    @staticmethod
    async def get_frame_async(
        video_path: str, public_id: str, timestamp_ms: float
    ) -> Result[bytes]:
        """Extract a single frame from a video file at the given timestamp (ms)."""

        import asyncio

        from core.framework.objectFiles import ObjectFiles
        from core.utils.frameExtractor import extract_video_frame

        async with ObjectFiles.local_copy_async(video_path) as local_path:
            return await asyncio.to_thread(
                extract_video_frame,
                full_video_path=local_path,
                public_id=public_id,
                timestamp_ms=timestamp_ms,
            )
