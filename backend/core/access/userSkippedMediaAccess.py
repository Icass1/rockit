from logging import Logger
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.access.db.ormModels.user_skipped_media import UserSkippedMediaRow
from backend.utils.logger import getLogger

logger: Logger = getLogger(__name__)


class UserSkippedMediaAccess:
    @staticmethod
    async def add_skip_async(
        session: AsyncSession, user_id: int, media_id: int, skip_direction_key: int
    ) -> AResult[UserSkippedMediaRow]:
        try:
            user_skipped_media = UserSkippedMediaRow(
                user_id=user_id,
                media_id=media_id,
                skip_direction_key=skip_direction_key,
            )
            session.add(instance=user_skipped_media)
            await session.commit()
            await session.refresh(instance=user_skipped_media)
            return AResult(code=AResultCode.OK, message="OK", result=user_skipped_media)

        except Exception as e:
            logger.error(f"Error in add_skip_async: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to add media skip: {e}",
            )
