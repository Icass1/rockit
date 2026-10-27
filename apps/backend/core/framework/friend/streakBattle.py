import uuid
from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.friend.streakBattle import StreakBattleRow
from logger import getLogger
from result import Result, ResultCode

logger = getLogger(__name__)


class StreakBattle:
    @staticmethod
    async def challenge_async(
        session: AsyncSession, challenger_id: int, challenged_id: int
    ) -> Result[dict[str, Any]]:
        if challenger_id == challenged_id:
            return Result(
                code=ResultCode.BAD_REQUEST,
                message="Cannot challenge yourself",
            )
        row = StreakBattleRow(
            public_id=str(uuid.uuid4()),
            challenger_id=challenger_id,
            challenged_id=challenged_id,
        )
        session.add(row)
        await session.flush()
        await session.refresh(row)
        return Result(
            code=ResultCode.OK,
            message="OK",
            result={"publicId": row.public_id},
        )

    @staticmethod
    def _calculate_streak(dates: list[date | str]) -> int:
        if not dates:
            return 0
        days = sorted(
            {datetime.fromisoformat(d).date() if isinstance(d, str) else d for d in dates},
            reverse=True,
        )
        today = datetime.now(UTC).date()
        if days[0] < today - timedelta(days=1):
            return 0
        streak = 0
        expected = days[0]
        for day in days:
            if day != expected:
                break
            streak += 1
            expected -= timedelta(days=1)
        return streak

    @staticmethod
    async def get_streak_for_user_async(session: AsyncSession, user_id: int) -> Result[int]:
        from core.access.statsAccess import StatsAccess as sa

        return await sa.get_current_streak_async(session=session, user_id=user_id)
