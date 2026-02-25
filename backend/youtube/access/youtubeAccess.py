import os
import uuid
import requests as req
from typing import Dict, List, Optional
from urllib.parse import parse_qs, urlparse

from sqlalchemy.future import select
from sqlalchemy import Result, Select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.backendUtils import create_id
from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.access.db import rockit_db
from backend.core.access.db.ormModels.image import ImageRow
from backend.core.access.db.ormModels.video import CoreVideoRow
from backend.core.access.db.ormModels.artist import CoreArtistRow
from backend.core.access.mediaAccess import MediaAccess

from backend.youtube.access.db.ormModels.video import VideoRow
from backend.youtube.access.db.ormModels.channel import ChannelRow
from backend.youtube.access.db.ormModels.externalImage import ExternalImageRow

from backend.youtube.youtubeApiTypes.rawYoutubeApiVideo import RawYoutubeVideo
from backend.youtube.youtubeApiTypes.rawYoutubeApiChannel import RawYoutubeChannel

from backend.constants import IMAGES_PATH


logger = getLogger(__name__)


def parse_duration_to_seconds(duration: str) -> int:
    """Parse YouTube ISO 8601 duration to seconds."""
    try:
        parsed: dict = parse_qs(urlparse(f"?{duration}").query)
        hours: int = int(parsed.get('H', ['0'])[0])
        minutes: int = int(parsed.get('M', ['0'])[0])
        seconds: int = int(parsed.get('S', ['0'])[0])
        return hours * 3600 + minutes * 60 + seconds
    except Exception:
        return 0


class YouTubeAccess:
    @staticmethod
    async def get_video_youtube_id_async(youtube_id: str, session: AsyncSession | None = None) -> AResult[VideoRow]:
        try:
            async with rockit_db.session_scope_or_session_async(session) as s:
                stmt: Select[Tuple[VideoRow]] = (
                    select(VideoRow)
                    .where(VideoRow.youtube_id == youtube_id)
                )
                result: Result[Tuple[VideoRow]] = await s.execute(stmt)
                video: VideoRow | None = result.scalar_one_or_none()

                if not video:
                    logger.error("Video not found")
                    return AResult(code=AResultCode.NOT_FOUND, message="Video not found")

                s.expunge(instance=video)
                return AResult(code=AResultCode.OK, message="OK", result=video)

        except Exception as e:
            logger.error(f"Failed to get video from youtube_id {youtube_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get video from youtube_id {youtube_id}: {e}")

    @staticmethod
    async def get_channel_youtube_id_async(youtube_id: str, session: AsyncSession | None = None) -> AResult[ChannelRow]:
        try:
            async with rockit_db.session_scope_or_session_async(session) as s:
                stmt: Select[Tuple[ChannelRow]] = (
                    select(ChannelRow)
                    .where(ChannelRow.youtube_id == youtube_id)
                )
                result: Result[Tuple[ChannelRow]] = await s.execute(stmt)
                channel: ChannelRow | None = result.scalar_one_or_none()

                if not channel:
                    logger.error("Channel not found")
                    return AResult(code=AResultCode.NOT_FOUND, message="Channel not found")

                s.expunge(instance=channel)
                return AResult(code=AResultCode.OK, message="OK", result=channel)

        except Exception as e:
            logger.error(f"Failed to get channel from youtube_id {youtube_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get channel from youtube_id {youtube_id}: {e}")

    @staticmethod
    async def get_channel_id_async(id: int, session: AsyncSession | None = None) -> AResult[ChannelRow]:
        try:
            async with rockit_db.session_scope_or_session_async(session) as s:
                stmt: Select[Tuple[ChannelRow]] = (
                    select(ChannelRow)
                    .where(ChannelRow.id == id)
                )
                result: Result[Tuple[ChannelRow]] = await s.execute(stmt)
                channel: ChannelRow | None = result.scalar_one_or_none()

                if not channel:
                    logger.error("Channel not found")
                    return AResult(code=AResultCode.NOT_FOUND, message="Channel not found")

                s.expunge(instance=channel)
                return AResult(code=AResultCode.OK, message="OK", result=channel)

        except Exception as e:
            logger.error(f"Failed to get channel from id {id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get channel from id {id}: {e}")

    @staticmethod
    async def _download_and_create_internal_image(
        url: str,
        session: AsyncSession | None = None
    ) -> AResult[ImageRow]:
        try:
            async with rockit_db.session_scope_or_session_async(session) as session:
                response = req.get(url, timeout=10)
                if response.status_code != 200:
                    return AResult(code=AResultCode.GENERAL_ERROR, message="Image download failed")
                filename = str(uuid.uuid4()) + ".jpg"
                full_path = os.path.join(IMAGES_PATH, filename)
                with open(full_path, 'wb') as f:
                    f.write(response.content)
                img = ImageRow(
                    public_id=create_id(32),
                    url=url,
                    path=filename)
                session.add(img)
                await session.flush()
                return AResult(code=AResultCode.OK, message="OK", result=img)
        except Exception as e:
            logger.error(f"Failed to download/create internal image: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to download/create internal image: {e}")

    @staticmethod
    async def _get_or_create_external_image(
            url: str,
            width: Optional[int],
            height: Optional[int],
            session: AsyncSession | None = None
    ) -> AResult[ExternalImageRow]:
        try:
            async with rockit_db.session_scope_or_session_async(session) as session:
                stmt = select(ExternalImageRow).where(
                    ExternalImageRow.url == url)
                result = await session.execute(stmt)
                row: ExternalImageRow | None = result.scalar_one_or_none()
                if row:
                    return AResult(code=AResultCode.OK, message="OK", result=row)
                row = ExternalImageRow(public_id=str(
                    uuid.uuid4()), url=url, width=width, height=height)
                session.add(row)
                await session.flush()
                return AResult(code=AResultCode.OK, message="OK", result=row)
        except Exception as e:
            logger.error(f"Failed to get/create external image: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get/create external image: {e}")

    @staticmethod
    async def get_or_create_channel(
        raw: RawYoutubeChannel,
        provider_id: int,
        session: AsyncSession | None = None
    ) -> AResult[ChannelRow]:
        try:
            async with rockit_db.session_scope_or_session_async(session) as session:
                stmt = (
                    select(ChannelRow)
                    .join(CoreArtistRow, CoreArtistRow.id == ChannelRow.id)
                    .where(ChannelRow.youtube_id == raw.id)
                )
                result = await session.execute(stmt)
                existing: ChannelRow | None = result.scalar_one_or_none()
                if existing:
                    return AResult(code=AResultCode.OK, message="OK", result=existing)

                internal_image_id: int | None = None
                snippet: dict = raw.snippet or {}
                thumbnails: dict = snippet.get("thumbnails", {})
                
                thumbnail_url: str = ""
                if "high" in thumbnails:
                    thumbnail_url = thumbnails["high"].get("url", "")
                elif "medium" in thumbnails:
                    thumbnail_url = thumbnails["medium"].get("url", "")
                elif "default" in thumbnails:
                    thumbnail_url = thumbnails["default"].get("url", "")

                if thumbnail_url:
                    a_img = await YouTubeAccess._download_and_create_internal_image(
                        thumbnail_url, session)
                    if a_img.is_ok():
                        internal_image_id = a_img.result().id

                core_artist = CoreArtistRow(
                    public_id=create_id(32),
                    provider_id=provider_id)
                session.add(core_artist)
                await session.flush()

                statistics: dict = raw.statistics or {}
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
                    internal_image_id=internal_image_id,
                    description=snippet.get("description"))
                session.add(channel_row)
                await session.flush()

                return AResult(code=AResultCode.OK, message="OK", result=channel_row)

        except Exception as e:
            logger.error(f"Failed to get/create channel: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get/create channel: {e}")

    @staticmethod
    async def get_or_create_video(
        raw: RawYoutubeVideo,
        channel_id: int,
        provider_id: int,
        session: AsyncSession | None = None
    ) -> AResult[VideoRow]:
        try:
            async with rockit_db.session_scope_or_session_async(session) as session:
                stmt = (
                    select(VideoRow)
                    .where(VideoRow.youtube_id == raw.id)
                )
                result = await session.execute(stmt)
                existing: VideoRow | None = result.scalar_one_or_none()
                if existing:
                    return AResult(code=AResultCode.OK, message="OK", result=existing)

                snippet: dict = raw.snippet or {}
                content_details: dict = raw.contentDetails or {}
                statistics: dict = raw.statistics or {}

                thumbnail_url: str = ""
                thumbnails: dict = snippet.get("thumbnails", {})
                if "high" in thumbnails:
                    thumbnail_url = thumbnails["high"].get("url", "")
                elif "medium" in thumbnails:
                    thumbnail_url = thumbnails["medium"].get("url", "")
                elif "default" in thumbnails:
                    thumbnail_url = thumbnails["default"].get("url", "")

                internal_image_id: int | None = None
                if thumbnail_url:
                    a_img = await YouTubeAccess._download_and_create_internal_image(
                        thumbnail_url, session)
                    if a_img.is_ok():
                        internal_image_id = a_img.result().id

                if internal_image_id is None:
                    return AResult(
                        code=AResultCode.GENERAL_ERROR,
                        message="Failed to create internal image for video")

                core_video = CoreVideoRow(
                    public_id=create_id(32),
                    name=snippet.get("title", ""),
                    view_type="video",
                    description=snippet.get("description"),
                    provider_id=provider_id)
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
                    duration=duration,
                    internal_image_id=internal_image_id,
                    channel_id=channel_id,
                    view_count=view_count,
                    like_count=like_count,
                    comment_count=comment_count,
                    path=None,
                    description=snippet.get("description"),
                    youtube_url=f"https://www.youtube.com/watch?v={raw.id}",
                    tags=tags_str,
                    published_at=snippet.get("publishedAt"))
                session.add(video_row)
                await session.flush()

                return AResult(code=AResultCode.OK, message="OK", result=video_row)

        except Exception as e:
            logger.error(f"Failed to get/create video: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get/create video: {e}")
