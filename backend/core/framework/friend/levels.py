from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.access.friend.userLevelAccess import UserLevelAccess
from backend.core.access.db.ormModels.friend.userLevel import (
    UserLevelRow,
    LevelConfigRow,
)
from backend.core.access.db.ormModels.user import UserRow

logger = getLogger(__name__)


class Levels:
    @staticmethod
    async def get_user_level_async(
        session: AsyncSession, user_id: int
    ) -> AResult[UserLevelRow]:
        a_result = await UserLevelAccess.get_or_create_user_level_async(
            session=session, user_id=user_id
        )
        if a_result.is_not_ok():
            logger.error(
                f"Error getting user level. {a_result.info()}", exc_info=True
            )
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def add_xp_async(
        session: AsyncSession, user_id: int, xp_amount: int
    ) -> AResult[UserLevelRow]:
        a_result = await UserLevelAccess.add_xp_async(
            session=session, user_id=user_id, xp_amount=xp_amount
        )
        if a_result.is_not_ok():
            logger.error(f"Error adding XP. {a_result.info()}", exc_info=True)
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def get_leaderboard_async(
        session: AsyncSession, limit: int = 50
    ) -> AResult[List[UserLevelRow]]:
        a_result = await UserLevelAccess.get_leaderboard_async(
            session=session, limit=limit
        )
        if a_result.is_not_ok():
            logger.error(
                f"Error getting leaderboard. {a_result.info()}", exc_info=True
            )
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def get_level_configs_async(
        session: AsyncSession,
    ) -> AResult[List[LevelConfigRow]]:
        a_result = await UserLevelAccess.get_level_configs_async(session=session)
        if a_result.is_not_ok():
            logger.error(
                f"Error getting level configs. {a_result.info()}", exc_info=True
            )
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())
