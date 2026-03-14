from logging import Logger
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.access.db.ormModels.user_media_clicked import UserMediaClickedRow
from backend.utils.logger import getLogger

logger: Logger = getLogger(__name__)


class UserMediaClickedAccess:
    @staticmethod
    async def add_click_async(
        session: AsyncSession, user_id: int, media_id: int
    ) -> AResult[UserMediaClickedRow]:
        try:
            user_media_clicked = UserMediaClickedRow(user_id=user_id, media_id=media_id)
            session.add(instance=user_media_clicked)
            await session.commit()
            await session.refresh(instance=user_media_clicked)
            return AResult(code=AResultCode.OK, message="OK", result=user_media_clicked)

        except Exception as e:
            logger.error(f"Error in add_click_async: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to add media click: {e}",
            )
