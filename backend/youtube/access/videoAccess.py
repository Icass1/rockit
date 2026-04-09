from logging import Logger
from typing import Tuple

from sqlalchemy.future import select
from sqlalchemy import Result, Select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.access.db.ormModels.media import CoreMediaRow
from backend.core.enums.mediaTypeEnum import MediaTypeEnum
from backend.core.utils.safeAsyncCall import safe_async
from backend.utils.logger import getLogger
from backend.youtube.access.db.ormModels.video import VideoRow

logger: Logger = getLogger(__name__)


class VideoAccess:
    @staticmethod
    @safe_async
    async def update_video_path_async(
        session: AsyncSession, video_id: int, video_path: str
    ) -> AResultCode:

        video: VideoRow | None = await session.get(entity=VideoRow, ident=video_id)

        if not video:
            logger.error(f"Video with id {video_id} not found.")
            return AResultCode(
                code=AResultCode.NOT_FOUND,
                message=f"Video with id {video_id} not found.",
            )

        video.video_path = video_path

        await session.flush()
        await session.commit()

        return AResultCode(code=AResultCode.OK, message="OK")

    @staticmethod
    @safe_async
    async def update_video_real_duration_async(
        session: AsyncSession, video_id: int, real_duration_ms: int | None
    ) -> AResultCode:

        video: VideoRow | None = await session.get(entity=VideoRow, ident=video_id)

        if not video:
            logger.error(f"Video with id {video_id} not found.")
            return AResultCode(
                code=AResultCode.NOT_FOUND,
                message=f"Video with id {video_id} not found.",
            )

        video.real_duration_ms = real_duration_ms

        await session.flush()
        await session.commit()

        return AResultCode(code=AResultCode.OK, message="OK")

    @staticmethod
    @safe_async
    async def get_video_from_public_id_async(
        session: AsyncSession, public_id: str
    ) -> AResult[VideoRow]:
        stmt: Select[Tuple[VideoRow]] = (
            select(VideoRow)
            .join(
                CoreMediaRow,
                and_(
                    CoreMediaRow.id == VideoRow.id,
                    CoreMediaRow.media_type_key == MediaTypeEnum.VIDEO.value,
                ),
            )
            .where(CoreMediaRow.public_id == public_id)
        )
        result: Result[Tuple[VideoRow]] = await session.execute(stmt)
        video: VideoRow | None = result.scalar_one_or_none()

        if not video:
            logger.error(f"Video with public id {public_id} not found.")
            return AResult(
                code=AResultCode.NOT_FOUND,
                message=f"Video with public id {public_id} not found.",
            )

        return AResult(code=AResultCode.OK, message="OK", result=video)
