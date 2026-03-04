from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode

from backend.youtube.access.db.ormModels.video import VideoRow
from backend.youtube.access.videoAccess import VideoAccess

logger = getLogger(__name__)


class Video:
    @staticmethod
    async def update_video_path_async(
        session: AsyncSession, video_id: int, path: str
    ) -> AResultCode:

        a_result: AResultCode = await VideoAccess.update_video_path_async(
            session=session, video_id=video_id, path=path
        )

        if a_result.is_not_ok():
            logger.error(f"Error updating video path. {a_result.info()}")
            return AResultCode(code=a_result.code(), message=a_result.message())

        return AResultCode(code=AResultCode.OK, message="OK")

    @staticmethod
    async def get_video_from_public_id_async(
        session: AsyncSession, public_id: str
    ) -> AResult[VideoRow]:

        a_result_video: AResult[VideoRow] = (
            await VideoAccess.get_video_from_public_id_async(
                session=session, public_id=public_id
            )
        )

        if a_result_video.is_not_ok():
            logger.error(
                f"Error getting video for public id {public_id}. {a_result_video.info()}"
            )
            return AResult(code=a_result_video.code(), message=a_result_video.message())

        return AResult(
            code=AResultCode.OK, message="OK", result=a_result_video.result()
        )
