from sqlalchemy.ext.asyncio import AsyncSession

from logger import getLogger
from result import Result, ResultCode
from youtube.access.db.ormModels.video import VideoRow
from youtube.access.videoAccess import VideoAccess

logger = getLogger(__name__)


class Video:
    @staticmethod
    async def update_video_path_async(
        session: AsyncSession, video_id: int, storage_object_id: int
    ) -> ResultCode:

        a_result: ResultCode = await VideoAccess.update_video_path_async(
            session=session, video_id=video_id, storage_object_id=storage_object_id
        )

        if a_result.is_not_ok():
            logger.error(f"Error updating video path. {a_result.info()}")
            return ResultCode(code=a_result.code(), message=a_result.message())

        return ResultCode(code=ResultCode.OK, message="OK")

    @staticmethod
    async def clear_video_paths_async(session: AsyncSession, video_id: int) -> ResultCode:

        a_result: ResultCode = await VideoAccess.clear_video_paths_async(
            session=session, video_id=video_id
        )

        if a_result.is_not_ok():
            logger.error(f"Error clearing video paths. {a_result.info()}")
            return ResultCode(code=a_result.code(), message=a_result.message())

        return ResultCode(code=ResultCode.OK, message="OK")

    @staticmethod
    async def update_video_real_duration_async(
        session: AsyncSession, video_id: int, real_duration_ms: int | None
    ) -> ResultCode:

        a_result: ResultCode = await VideoAccess.update_video_real_duration_async(
            session=session, video_id=video_id, real_duration_ms=real_duration_ms
        )

        if a_result.is_not_ok():
            logger.error(f"Error updating video real duration. {a_result.info()}")
            return ResultCode(code=a_result.code(), message=a_result.message())

        return ResultCode(code=ResultCode.OK, message="OK")

    @staticmethod
    async def get_video_from_public_id_async(
        session: AsyncSession, public_id: str
    ) -> Result[VideoRow]:

        a_result_video: Result[VideoRow] = await VideoAccess.get_video_from_public_id_async(
            session=session, public_id=public_id
        )

        if a_result_video.is_not_ok():
            logger.error(f"Error getting video for public id {public_id}. {a_result_video.info()}")
            return Result(code=a_result_video.code(), message=a_result_video.message())

        return Result(code=ResultCode.OK, message="OK", result=a_result_video.result())
