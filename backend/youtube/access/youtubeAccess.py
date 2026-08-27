from typing import Any, List, Optional, Tuple
from urllib.parse import parse_qs, urlparse

from sqlalchemy.future import select
from sqlalchemy import Result, Select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.backendUtils import create_id
from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode
from backend.core.framework.media.image import Image

from backend.core.access.db.ormModels.image import ImageRow
from backend.core.access.db.ormModels.media import CoreMediaRow
from backend.core.enums.mediaTypeEnum import MediaTypeEnum

from backend.youtube.access.db.ormModels.video import VideoRow
from backend.youtube.access.db.ormModels.channel import ChannelRow
from backend.youtube.access.db.ormModels.externalImage import ExternalImageRow

from backend.youtube.youtubeApiTypes.rawYoutubeApiVideo import RawYoutubeVideo
from backend.youtube.youtubeApiTypes.rawYoutubeApiChannel import RawYoutubeChannel

logger = getLogger(__name__)


def parse_duration_to_seconds(duration: str) -> int:
    """Parse YouTube ISO 8601 duration to seconds."""
    try:
        parsed: dict[str, list[str]] = parse_qs(urlparse(f"?{duration}").query)
        hours: int = int(parsed.get("H", ["0"])[0])
        minutes: int = int(parsed.get("M", ["0"])[0])
        seconds: int = int(parsed.get("S", ["0"])[0])
        return hours * 3600 + minutes * 60 + seconds
    except Exception:
        return 0


class YouTubeAccess:
    @staticmethod
    async def get_video_youtube_id_async(
        session: AsyncSession,
        youtube_id: str,
    ) -> AResult[VideoRow]:
        try:
            stmt: Select[Tuple[VideoRow]] = select(VideoRow).where(
                VideoRow.youtube_id == youtube_id
            )
            result: Result[Tuple[VideoRow]] = await session.execute(stmt)
            video: VideoRow | None = result.scalar_one_or_none()

            if not video:
                logger.warning("Video not found on local database")
                return AResult(code=AResultCode.NOT_FOUND, message="Video not found")

            session.expunge(instance=video)
            return AResult(code=AResultCode.OK, message="OK", result=video)

        except Exception as e:
            logger.error(f"Failed to get video from youtube_id {youtube_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get video from youtube_id {youtube_id}: {e}",
            )

    @staticmethod
    async def get_channel_youtube_id_async(
        session: AsyncSession,
        youtube_id: str,
    ) -> AResult[ChannelRow]:
        try:
            stmt: Select[Tuple[ChannelRow]] = select(ChannelRow).where(
                ChannelRow.youtube_id == youtube_id
            )
            result: Result[Tuple[ChannelRow]] = await session.execute(stmt)
            channel: ChannelRow | None = result.scalar_one_or_none()

            if not channel:
                logger.error("Channel not found")
                return AResult(code=AResultCode.NOT_FOUND, message="Channel not found")

            session.expunge(instance=channel)
            return AResult(code=AResultCode.OK, message="OK", result=channel)

        except Exception as e:
            logger.error(f"Failed to get channel from youtube_id {youtube_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get channel from youtube_id {youtube_id}: {e}",
            )

    @staticmethod
    async def get_channel_id_async(
        session: AsyncSession,
        id: int,
    ) -> AResult[ChannelRow]:
        try:
            stmt: Select[Tuple[ChannelRow]] = select(ChannelRow).where(
                ChannelRow.id == id
            )
            result: Result[Tuple[ChannelRow]] = await session.execute(stmt)
            channel: ChannelRow | None = result.scalar_one_or_none()

            if not channel:
                logger.error("Channel not found")
                return AResult(code=AResultCode.NOT_FOUND, message="Channel not found")

            session.expunge(instance=channel)
            return AResult(code=AResultCode.OK, message="OK", result=channel)

        except Exception as e:
            logger.error(f"Failed to get channel from id {id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get channel from id {id}: {e}",
            )

    @staticmethod
    async def get_downloaded_youtube_ids_async(
        session: AsyncSession,
        youtube_ids: List[str],
    ) -> set[str]:
        """Return the subset of youtube_ids whose video_path or audio_path is not null."""

        if not youtube_ids:
            return set()

        try:
            stmt: Select[Tuple[str]] = select(VideoRow.youtube_id).where(
                VideoRow.youtube_id.in_(youtube_ids),
                VideoRow.video_path.isnot(None),
            )
            result: Result[Tuple[str]] = await session.execute(stmt)
            return {row[0] for row in result.all()}
        except Exception as e:
            logger.error(f"Failed to get downloaded youtube ids: {e}")
            return set()

    @staticmethod
    async def get_downloaded_youtube_public_ids_async(
        session: AsyncSession,
        youtube_ids: List[str],
    ) -> dict[str, str]:
        """Return a mapping of youtube_id → public_id for downloaded videos."""

        if not youtube_ids:
            return {}

        try:
            stmt: Select[Tuple[str, str]] = (
                select(VideoRow.youtube_id, CoreMediaRow.public_id)
                .join(CoreMediaRow, VideoRow.id == CoreMediaRow.id)
                .where(
                    VideoRow.youtube_id.in_(youtube_ids),
                    VideoRow.video_path.isnot(None),
                )
            )
            result: Result[Tuple[str, str]] = await session.execute(stmt)
            return {row[0]: row[1] for row in result.all()}
        except Exception as e:
            logger.error(f"Failed to get downloaded youtube public ids: {e}")
            return {}

    @staticmethod
    async def _get_or_create_external_image(
        session: AsyncSession,
        url: str,
        width: Optional[int],
        height: Optional[int],
    ) -> AResult[ExternalImageRow]:
        try:
            stmt = select(ExternalImageRow).where(ExternalImageRow.url == url)
            result = await session.execute(stmt)
            row: ExternalImageRow | None = result.scalar_one_or_none()
            if row:
                return AResult(code=AResultCode.OK, message="OK", result=row)
            row = ExternalImageRow(
                public_id=create_id(32), url=url, width=width, height=height
            )
            session.add(row)
            await session.flush()
            return AResult(code=AResultCode.OK, message="OK", result=row)
        except Exception as e:
            logger.error(f"Failed to get/create external image: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get/create external image: {e}",
            )

    @staticmethod
    async def get_or_create_channel(
        session: AsyncSession,
        raw: RawYoutubeChannel,
        provider_id: int,
        image_id: int | None = None,
    ) -> AResult[ChannelRow]:
        try:
            stmt = (
                select(ChannelRow)
                .join(
                    CoreMediaRow,
                    and_(
                        CoreMediaRow.id == ChannelRow.id,
                        CoreMediaRow.media_type_key == MediaTypeEnum.ARTIST.value,
                    ),
                )
                .where(ChannelRow.youtube_id == raw.id)
            )
            result = await session.execute(stmt)
            existing: ChannelRow | None = result.scalar_one_or_none()
            if existing:
                return AResult(code=AResultCode.OK, message="OK", result=existing)

            if image_id is None:
                a_result_image: AResult[ImageRow] = (
                    await Image.get_image_from_path_async(
                        session=session, path="album-placeholder.png"
                    )
                )
                if a_result_image.is_ok():
                    image_id = a_result_image.result().id
                else:
                    logger.error(
                        f"Error getting placeholder image: {a_result_image.info()}"
                    )
                    return AResult(
                        code=AResultCode.GENERAL_ERROR,
                        message="Failed to get placeholder image",
                    )

            core_artist = CoreMediaRow(
                public_id=create_id(32),
                provider_id=provider_id,
                media_type_key=MediaTypeEnum.ARTIST.value,
            )
            session.add(core_artist)
            await session.flush()

            statistics: dict[str, Any] = raw.statistics or {}
            snippet: dict[str, Any] = raw.snippet or {}
            subscriber_count: int = 0
            try:
                subscriber_count = int(statistics.get("subscriberCount", 0))
            except (ValueError, TypeError):
                pass

            view_count: int = 0
            try:
                view_count = int(statistics.get("viewCount", 0))
            except (ValueError, TypeError):
                pass

            video_count: int = 0
            try:
                video_count = int(statistics.get("videoCount", 0))
            except (ValueError, TypeError):
                pass

            channel_name: str = snippet.get("title", "")

            channel_row = ChannelRow(
                id=core_artist.id,
                youtube_id=raw.id or "",
                name=channel_name,
                subscriber_count=subscriber_count,
                view_count=view_count,
                video_count=video_count,
                image_id=image_id,
                description=snippet.get("description"),
            )
            session.add(channel_row)
            await session.flush()

            return AResult(code=AResultCode.OK, message="OK", result=channel_row)

        except Exception as e:
            logger.error(f"Failed to get/create channel: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get/create channel: {e}",
            )

    @staticmethod
    async def get_or_create_video(
        session: AsyncSession,
        raw: RawYoutubeVideo,
        channel_id: int,
        provider_id: int,
        image_id: int | None = None,
    ) -> AResult[VideoRow]:
        try:
            stmt = select(VideoRow).where(VideoRow.youtube_id == raw.id)
            result = await session.execute(stmt)
            existing: VideoRow | None = result.scalar_one_or_none()
            if existing:
                return AResult(code=AResultCode.OK, message="OK", result=existing)

            snippet: dict[str, Any] = raw.snippet or {}
            content_details: dict[str, Any] = raw.contentDetails or {}
            statistics: dict[str, Any] = raw.statistics or {}

            if image_id is None:
                return AResult(
                    code=AResultCode.GENERAL_ERROR,
                    message="Failed to create internal image for video",
                )

            core_video = CoreMediaRow(
                public_id=create_id(32),
                provider_id=provider_id,
                media_type_key=MediaTypeEnum.VIDEO.value,
            )
            session.add(core_video)
            await session.flush()

            duration_str: str = content_details.get("duration", "PT0M0S")
            duration: int = parse_duration_to_seconds(duration_str)

            view_count: int = 0
            try:
                view_count = int(statistics.get("viewCount", 0))
            except (ValueError, TypeError):
                pass

            like_count: int = 0
            try:
                like_count = int(statistics.get("likeCount", 0))
            except (ValueError, TypeError):
                pass

            comment_count: int = 0
            try:
                comment_count = int(statistics.get("commentCount", 0))
            except (ValueError, TypeError):
                pass

            tags_str: str = ""
            tags: List[str] = snippet.get("tags", [])
            if tags:
                tags_str = ",".join(tags)

            video_row = VideoRow(
                id=core_video.id,
                youtube_id=raw.id or "",
                name=snippet.get("title", ""),
                duration_ms=duration if duration != 0 else None,
                image_id=image_id,
                channel_id=channel_id,
                view_count=view_count,
                like_count=like_count,
                comment_count=comment_count,
                video_path=None,
                description=snippet.get("description"),
                youtube_url=f"https://www.youtube.com/watch?v={raw.id}",
                tags=tags_str,
                published_at=snippet.get("publishedAt"),
            )
            session.add(video_row)
            await session.flush()

            return AResult(code=AResultCode.OK, message="OK", result=video_row)

        except Exception as e:
            logger.error(f"Failed to get/create video: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get/create video: {e}",
            )
