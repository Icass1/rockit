from typing import Any, List, TYPE_CHECKING
from sqlalchemy.ext.asyncio import AsyncSession

from backend.constants import BACKEND_URL
from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode

from backend.core.access.db.ormModels.image import ImageRow
from backend.core.access.db.ormModels.media import CoreMediaRow
from backend.core.access.mediaAccess import MediaAccess

from backend.youtube.access.youtubeAccess import YouTubeAccess
from backend.youtube.access.db.ormModels.video import VideoRow
from backend.youtube.access.db.ormModels.channel import ChannelRow

from backend.youtube.framework.youtubeApi import youtube_api

from backend.youtube.responses.videoResponse import YoutubeVideoResponse
from backend.youtube.responses.channelResponse import YoutubeChannelResponse
from backend.core.responses.baseArtistResponse import BaseArtistResponse

from backend.youtube.youtubeApiTypes.rawYoutubeApiVideo import RawYoutubeVideo
from backend.youtube.youtubeApiTypes.rawYoutubeApiChannel import RawYoutubeChannel

if TYPE_CHECKING:
    from backend.youtube.framework.provider.yotubeProvider import YoutubeProvider


logger = getLogger(__name__)


class YouTube:
    provider: "YoutubeProvider"
    provider_name: str

    @staticmethod
    async def get_video_async(
        session: AsyncSession, youtube_id: str
    ) -> AResult[YoutubeVideoResponse]:
        """Get a video by ID, fetching from YouTube API and populating the database if not found."""

        a_result_video: AResult[VideoRow] = (
            await YouTubeAccess.get_video_youtube_id_async(
                session=session, youtube_id=youtube_id
            )
        )
        if a_result_video.is_ok():
            video_row: VideoRow = a_result_video.result()

            a_result_core_video: AResult[CoreMediaRow] = (
                await MediaAccess.get_media_from_id_async(session, id=video_row.id)
            )
            if a_result_core_video.is_not_ok():
                logger.error(f"Error getting core video. {a_result_core_video.info()}")
                return AResult(
                    code=a_result_core_video.code(),
                    message=a_result_core_video.message(),
                )

            core_video: CoreMediaRow = a_result_core_video.result()

            a_result_channel: AResult[ChannelRow] = (
                await YouTubeAccess.get_channel_id_async(
                    session=session, id=video_row.channel_id
                )
            )
            channel: ChannelRow = (
                a_result_channel.result() if a_result_channel.is_ok() else None
            )

            a_result_internal_image: AResult[ImageRow] = (
                await MediaAccess.get_image_from_id_async(
                    session=session, id=video_row.image_id
                )
            )
            image_url: str = ""
            if a_result_internal_image.is_ok():
                image_url = f"{BACKEND_URL}/media/image/{a_result_internal_image.result().public_id}"
            else:
                image_url = (
                    f"https://i.ytimg.com/vi/{video_row.youtube_id}/maxresdefault.jpg"
                )

            channel_response: YoutubeChannelResponse | None = None
            if channel:
                channel_internal_image_url: str = ""
                if channel.image_id:
                    a_result_channel_image: AResult[ImageRow] = (
                        await MediaAccess.get_image_from_id_async(
                            session, id=channel.image_id
                        )
                    )
                    if a_result_channel_image.is_ok():
                        channel_internal_image_url = f"{BACKEND_URL}/media/image/{a_result_channel_image.result().public_id}"
                    else:
                        channel_internal_image_url = channel.image_url or ""

                channel_response = YoutubeChannelResponse(
                    provider=YouTube.provider_name,
                    publicId=channel.youtube_id,
                    name=channel.name,
                    imageUrl=channel_internal_image_url,
                    subscriberCount=channel.subscriber_count,
                    videoCount=channel.video_count,
                    viewCount=channel.view_count,
                    description=channel.description,
                )

            tags: List[str] = []
            if video_row.tags:
                tags = video_row.tags.split(",")

            artists: List[BaseArtistResponse] = []
            if channel_response:
                artists = [
                    BaseArtistResponse(
                        provider=channel_response.provider,
                        publicId=channel_response.publicId,
                        url=f"https://www.youtube.com/channel/{channel_response.publicId}",
                        name=channel_response.name,
                        imageUrl=channel_response.imageUrl or "",
                    )
                ]

            is_downloaded: bool = (
                video_row.video_path is not None or video_row.audio_path is not None
            )

            video_src: str | None = None
            if video_row.video_path:
                video_src = f"/youtube/video/{video_row.youtube_id}/stream"

            audio_src: str | None = None
            if video_row.audio_path:
                audio_src = f"/youtube/video/{video_row.youtube_id}/audio"

            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=YoutubeVideoResponse(
                    provider=YouTube.provider_name,
                    publicId=core_video.public_id,
                    url=video_row.youtube_url or "",
                    youtubeId=video_row.youtube_id,
                    name=video_row.name,
                    duration_ms=video_row.duration_ms,
                    viewCount=video_row.view_count,
                    likeCount=video_row.like_count,
                    commentCount=video_row.comment_count,
                    imageUrl=image_url,
                    artists=artists,
                    channel=channel_response,
                    description=video_row.description,
                    youtubeUrl=video_row.youtube_url,
                    tags=tags,
                    publishedAt=video_row.published_at,
                    audio_path=video_row.audio_path,
                    video_path=video_row.video_path,
                    downloaded=is_downloaded,
                    videoSrc=video_src,
                    audioSrc=audio_src,
                ),
            )

        if a_result_video.code() != AResultCode.NOT_FOUND:
            logger.error(f"Error getting video. {a_result_video.info()}")
            return AResult(code=a_result_video.code(), message=a_result_video.message())

        a_result_api_video: AResult[RawYoutubeVideo] = (
            await youtube_api.get_video_async(youtube_id)
        )
        if a_result_api_video.is_not_ok():
            logger.error(
                f"Error getting video from YouTube API. {a_result_api_video.info()}"
            )
            return AResult(
                code=a_result_api_video.code(), message=a_result_api_video.message()
            )

        raw_video: RawYoutubeVideo = a_result_api_video.result()

        snippet: dict[str, Any] = raw_video.snippet or {}
        channel_id: str = snippet.get("channelId", "")

        a_result_api_channel: AResult[RawYoutubeChannel] = (
            await youtube_api.get_channel_async(channel_id)
        )
        if a_result_api_channel.is_not_ok():
            logger.error(
                f"Error getting channel from YouTube API. {a_result_api_channel.info()}"
            )
            return AResult(
                code=a_result_api_channel.code(), message=a_result_api_channel.message()
            )

        raw_channel: RawYoutubeChannel = a_result_api_channel.result()

        a_result_provider_id: AResult[int] = YouTube.provider.get_id()
        if a_result_provider_id.is_not_ok():
            logger.error(f"Error getting provider id. {a_result_provider_id.info()}")
            return AResult(
                code=a_result_provider_id.code(), message=a_result_provider_id.message()
            )

        provider_id: int = a_result_provider_id.result()

        try:
            a_result_channel_row: AResult[ChannelRow] = (
                await YouTubeAccess.get_or_create_channel(
                    session, raw=raw_channel, provider_id=provider_id
                )
            )
            if a_result_channel_row.is_not_ok():
                return AResult(
                    code=a_result_channel_row.code(),
                    message=a_result_channel_row.message(),
                )

            channel_row: ChannelRow = a_result_channel_row.result()

            a_result_video_row: AResult[VideoRow] = (
                await YouTubeAccess.get_or_create_video(
                    session,
                    raw=raw_video,
                    channel_id=channel_row.id,
                    provider_id=provider_id,
                )
            )
            if a_result_video_row.is_not_ok():
                return AResult(
                    code=a_result_video_row.code(),
                    message=a_result_video_row.message(),
                )

            video_row = a_result_video_row.result()

        except Exception as e:
            logger.error(f"Failed to populate video in DB: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to populate video in DB: {e}",
            )

        a_result_core_video: AResult[CoreMediaRow] = (
            await MediaAccess.get_media_from_id_async(session, id=video_row.id)
        )
        if a_result_core_video.is_not_ok():
            logger.error(f"Error getting core video. {a_result_core_video.info()}")
            return AResult(
                code=a_result_core_video.code(), message=a_result_core_video.message()
            )

        core_video: CoreMediaRow = a_result_core_video.result()

        a_result_fetched_channel: AResult[ChannelRow] = (
            await YouTubeAccess.get_channel_youtube_id_async(
                session=session, youtube_id=channel_id
            )
        )
        fetched_channel: ChannelRow = (
            a_result_fetched_channel.result()
            if a_result_fetched_channel.is_ok()
            else None
        )

        a_result_internal_image: AResult[ImageRow] = (
            await MediaAccess.get_image_from_id_async(
                session=session, id=video_row.image_id
            )
        )
        image_url: str = ""
        if a_result_internal_image.is_ok():
            image_url = f"{BACKEND_URL}/media/image/{a_result_internal_image.result().public_id}"
        else:
            image_url = (
                f"https://i.ytimg.com/vi/{video_row.youtube_id}/maxresdefault.jpg"
            )

        channel_response: YoutubeChannelResponse | None = None
        if fetched_channel:
            channel_internal_image_url: str = ""
            if fetched_channel.image_id:
                a_result_channel_image: AResult[ImageRow] = (
                    await MediaAccess.get_image_from_id_async(
                        session, id=fetched_channel.image_id
                    )
                )
                if a_result_channel_image.is_ok():
                    channel_internal_image_url = f"{BACKEND_URL}/media/image/{a_result_channel_image.result().public_id}"
                else:
                    channel_internal_image_url = fetched_channel.image_url or ""

            channel_response = YoutubeChannelResponse(
                provider=YouTube.provider_name,
                publicId=fetched_channel.youtube_id,
                name=fetched_channel.name,
                imageUrl=channel_internal_image_url,
                subscriberCount=fetched_channel.subscriber_count,
                videoCount=fetched_channel.video_count,
                viewCount=fetched_channel.view_count,
                description=fetched_channel.description,
            )

        tags: List[str] = []
        if video_row.tags:
            tags = video_row.tags.split(",")

        artists: List[BaseArtistResponse] = []
        if channel_response:
            artists = [
                BaseArtistResponse(
                    provider=channel_response.provider,
                    publicId=channel_response.publicId,
                    url=f"https://www.youtube.com/channel/{channel_response.publicId}",
                    name=channel_response.name,
                    imageUrl=channel_response.imageUrl or "",
                )
            ]

        is_downloaded: bool = (
            video_row.video_path is not None or video_row.audio_path is not None
        )

        video_src: str | None = None
        if video_row.video_path:
            video_src = f"/youtube/video/{video_row.youtube_id}/stream"

        audio_src: str | None = None
        if video_row.audio_path:
            audio_src = f"/youtube/video/{video_row.youtube_id}/audio"

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=YoutubeVideoResponse(
                provider=YouTube.provider_name,
                publicId=core_video.public_id,
                url=video_row.youtube_url or "",
                youtubeId=video_row.youtube_id,
                name=video_row.name,
                duration_ms=video_row.duration_ms,
                viewCount=video_row.view_count,
                likeCount=video_row.like_count,
                commentCount=video_row.comment_count,
                imageUrl=image_url,
                artists=artists,
                channel=channel_response,
                description=video_row.description,
                youtubeUrl=video_row.youtube_url,
                tags=tags,
                publishedAt=video_row.published_at,
                audio_path=video_row.audio_path,
                video_path=video_row.video_path,
                downloaded=is_downloaded,
                videoSrc=video_src,
                audioSrc=audio_src,
            ),
        )
