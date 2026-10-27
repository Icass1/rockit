from collections.abc import Sequence

from sqlalchemy import desc, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.friend.levelConfig import LevelConfigRow
from core.access.db.ormModels.friend.userLevel import UserLevelRow
from core.access.db.ormModels.user_media_listened import UserMediaListenedRow
from core.aResult import AResult, AResultCode
from core.utils.safeAsyncCall import safe_async
from logger import getLogger

logger = getLogger(__name__)


class UserLevelAccess:
    @staticmethod
    @safe_async
    async def get_or_create_user_level_async(
        session: AsyncSession, user_id: int
    ) -> AResult[UserLevelRow]:
        levels = await UserLevelAccess.get_user_levels_async(session, [user_id])
        if levels.is_not_ok():
            logger.error(f"Error calculating user level. {levels.info()}")
            return AResult(code=levels.code(), message=levels.message())
        rows = levels.result()
        if not rows:
            return AResult(code=AResultCode.NOT_FOUND, message="User not found")
        return AResult(code=AResultCode.OK, message="OK", result=rows[0])

    @staticmethod
    @safe_async
    async def add_xp_async(
        session: AsyncSession, user_id: int, xp_amount: int
    ) -> AResult[UserLevelRow]:
        a_result = await UserLevelAccess.get_or_create_user_level_async(
            session=session, user_id=user_id
        )
        if a_result.is_not_ok():
            return AResult(code=a_result.code(), message=a_result.message())
        level_row = a_result.result()
        level_row.xp += xp_amount
        a_config = await UserLevelAccess.get_level_configs_async(session=session)
        if a_config.is_ok():
            configs = sorted(a_config.result(), key=lambda c: c.level)
            for config in configs:
                if level_row.xp >= config.xp_required and config.level > level_row.level:
                    level_row.level = config.level
        await session.flush()
        await session.refresh(level_row)
        return AResult(code=AResultCode.OK, message="OK", result=level_row)

    @staticmethod
    @safe_async
    async def get_level_configs_async(
        session: AsyncSession,
    ) -> AResult[list[LevelConfigRow]]:
        defaults = [
            {"level": level, "xp_required": threshold, "title": title}
            for level, threshold, title in [
                (1, 0, "NEWCOMER"),
                (2, 100, "EXPLORER"),
                (3, 500, "ENTHUSIAST"),
                (4, 1500, "CONNOISSEUR"),
                (5, 5000, "LEGEND"),
            ]
        ]
        await session.execute(
            insert(LevelConfigRow)
            .values(defaults)
            .on_conflict_do_nothing(index_elements=[LevelConfigRow.level])
        )
        stmt = select(LevelConfigRow).order_by(LevelConfigRow.level)
        result = await session.execute(stmt)
        rows: Sequence[LevelConfigRow] = result.scalars().all()
        return AResult(code=AResultCode.OK, message="OK", result=list(rows))

    @staticmethod
    @safe_async
    async def get_leaderboard_async(
        session: AsyncSession, limit: int = 50
    ) -> AResult[list[UserLevelRow]]:
        stmt = select(UserLevelRow).order_by(desc(UserLevelRow.xp)).limit(limit)
        result = await session.execute(stmt)
        rows: Sequence[UserLevelRow] = result.scalars().all()
        return AResult(code=AResultCode.OK, message="OK", result=list(rows))

    @staticmethod
    @safe_async
    async def get_user_level_by_user_id_async(
        session: AsyncSession, user_id: int
    ) -> AResult[UserLevelRow | None]:
        stmt = select(UserLevelRow).where(UserLevelRow.user_id == user_id)
        result = await session.execute(stmt)
        row: UserLevelRow | None = result.scalars().first()
        if row is None:
            return AResult(code=AResultCode.NOT_FOUND, message="Not found")
        return AResult(code=AResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def get_user_levels_async(
        session: AsyncSession, user_ids: list[int]
    ) -> AResult[list[UserLevelRow]]:
        if not user_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])
        configs = await UserLevelAccess.get_level_configs_async(session)
        if configs.is_not_ok():
            logger.error(f"Error getting level thresholds. {configs.info()}")
            return AResult(code=configs.code(), message=configs.message())
        counts = await session.execute(
            select(UserMediaListenedRow.user_id, func.count().label("plays"))
            .where(UserMediaListenedRow.user_id.in_(user_ids))
            .group_by(UserMediaListenedRow.user_id)
        )
        xp_by_user = {user_id: int(plays) * 10 for user_id, plays in counts}
        values: list[dict[str, int]] = []
        for user_id in user_ids:
            xp = xp_by_user.get(user_id, 0)
            level = max((c.level for c in configs.result() if c.xp_required <= xp), default=1)
            values.append({"user_id": user_id, "xp": xp, "level": level})
        statement = insert(UserLevelRow).values(values)
        await session.execute(
            statement.on_conflict_do_nothing(index_elements=[UserLevelRow.user_id])
        )
        rows = await session.execute(
            select(UserLevelRow)
            .where(UserLevelRow.user_id.in_(user_ids))
            .execution_options(populate_existing=True)
        )
        return AResult(code=AResultCode.OK, message="OK", result=list(rows.scalars()))
