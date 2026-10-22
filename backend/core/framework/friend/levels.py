from typing import List
from backend.core.responses.friend.userLevelResponse import UserLevelResponse

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.access.friend.userLevelAccess import UserLevelAccess
from backend.core.access.db.ormModels.friend.userLevel import UserLevelRow
from backend.core.access.db.ormModels.friend.levelConfig import LevelConfigRow

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
            logger.error(f"Error getting user level. {a_result.info()}", exc_info=True)
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
            logger.error(f"Error getting leaderboard. {a_result.info()}", exc_info=True)
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

    @staticmethod
    async def get_profiles_async(
        session: AsyncSession, user_ids: list[int]
    ) -> AResult[list["UserLevelResponse"]]:
        from backend.core.access.friend.friendAccess import FriendAccess
        from backend.core.access.statsAccess import get_streaks_for_users_async

        users = await FriendAccess.get_users_async(session, user_ids)
        levels = await UserLevelAccess.get_user_levels_async(session, user_ids)
        configs = await UserLevelAccess.get_level_configs_async(session)
        streaks = await get_streaks_for_users_async(session, user_ids)
        for result in (users, levels, configs, streaks):
            if result.is_not_ok():
                logger.error(f"Error getting social profiles. {result.info()}")
                return AResult(code=result.code(), message=result.message())
        by_user = {row.user_id: row for row in levels.result()}
        responses: list[UserLevelResponse] = []
        for user in users.result():
            row = by_user[user.id]
            title = next(
                (c.title for c in configs.result() if c.level == row.level), ""
            )
            next_xp = next(
                (c.xp_required for c in configs.result() if c.level > row.level), row.xp
            )
            responses.append(
                UserLevelResponse(
                    userId=user.public_id,
                    username=user.username,
                    imageUrl=user.image.url if user.image else None,
                    level=row.level,
                    xp=row.xp,
                    xpToNext=max(0, next_xp - row.xp),
                    title=title,
                    streak=streaks.result().get(user.id, 0),
                    songsListened=row.xp // 10,
                    levelStartXp=next(
                        (
                            c.xp_required
                            for c in configs.result()
                            if c.level == row.level
                        ),
                        0,
                    ),
                )
            )
        return AResult(code=AResultCode.OK, message="OK", result=responses)
