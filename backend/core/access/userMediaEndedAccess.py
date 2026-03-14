from logging import Logger
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.access.db.ormModels.user_media_ended import UserMediaEndedRow
from backend.utils.logger import getLogger

logger: Logger = getLogger(__name__)


class UserMediaEndedAccess:
    @staticmethod
    async def add_ended_async(
        session: AsyncSession, user_id: int, media_id: int
    ) -> AResult[UserMediaEndedRow]:
        try:
            user_media_ended = UserMediaEndedRow(user_id=user_id, media_id=media_id)
            session.add(instance=user_media_ended)
            await session.commit()
            await session.refresh(instance=user_media_ended)
            return AResult(code=AResultCode.OK, message="OK", result=user_media_ended)

        except Exception as e:
            logger.error(f"Error in add_ended_async: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to add media ended: {e}",
            )
