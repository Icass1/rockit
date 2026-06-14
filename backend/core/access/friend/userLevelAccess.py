from typing import List, Sequence

from sqlalchemy import Result, Select, select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.utils.safeAsyncCall import safe_async
from backend.core.access.db.ormModels.friend.userLevel import UserLevelRow
from backend.core.access.db.ormModels.friend.levelConfig import LevelConfigRow

logger = getLogger(__name__)


class UserLevelAccess:
    @staticmethod
    @safe_async
    async def get_or_create_user_level_async(
        session: AsyncSession, user_id: int
    ) -> AResult[UserLevelRow]:
        stmt: Select = select(UserLevelRow).where(UserLevelRow.user_id == user_id)
        result: Result = await session.execute(stmt)
        row: UserLevelRow | None = result.scalars().first()
        if row is not None:
            return AResult(code=AResultCode.OK, message="OK", result=row)
        row = UserLevelRow(user_id=user_id)
        session.add(row)
        await session.flush()
        await session.refresh(row)
        return AResult(code=AResultCode.OK, message="OK", result=row)

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
                if (
                    level_row.xp >= config.xp_required
                    and config.level > level_row.level
                ):
                    level_row.level = config.level
        await session.flush()
        await session.refresh(level_row)
        return AResult(code=AResultCode.OK, message="OK", result=level_row)

    @staticmethod
    @safe_async
    async def get_level_configs_async(
        session: AsyncSession,
    ) -> AResult[List[LevelConfigRow]]:
        stmt: Select = select(LevelConfigRow).order_by(LevelConfigRow.level)
        result: Result = await session.execute(stmt)
        rows: Sequence[LevelConfigRow] = result.scalars().all()
        return AResult(code=AResultCode.OK, message="OK", result=list(rows))

    @staticmethod
    @safe_async
    async def get_leaderboard_async(
        session: AsyncSession, limit: int = 50
    ) -> AResult[List[UserLevelRow]]:
        stmt: Select = select(UserLevelRow).order_by(desc(UserLevelRow.xp)).limit(limit)
        result: Result = await session.execute(stmt)
        rows: Sequence[UserLevelRow] = result.scalars().all()
        return AResult(code=AResultCode.OK, message="OK", result=list(rows))

    @staticmethod
    @safe_async
    async def get_user_level_by_user_id_async(
        session: AsyncSession, user_id: int
    ) -> AResult[UserLevelRow | None]:
        stmt: Select = select(UserLevelRow).where(UserLevelRow.user_id == user_id)
        result: Result = await session.execute(stmt)
        row: UserLevelRow | None = result.scalars().first()
        return AResult(code=AResultCode.OK, message="OK", result=row)
