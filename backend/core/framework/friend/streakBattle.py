import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.access.db.ormModels.friend.streakBattle import StreakBattleRow

logger = getLogger(__name__)


class StreakBattle:
    @staticmethod
    async def challenge_async(
        session: AsyncSession, challenger_id: int, challenged_id: int
    ) -> AResult[Dict[str, Any]]:
        if challenger_id == challenged_id:
            return AResult(
                code=AResultCode.BAD_REQUEST,
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
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result={"publicId": row.public_id},
        )

    @staticmethod
    def _calculate_streak(dates: list[date | str]) -> int:
        if not dates:
            return 0
        days = sorted(
            {
                datetime.fromisoformat(d).date() if isinstance(d, str) else d
                for d in dates
            },
            reverse=True,
        )
        today = datetime.now(timezone.utc).date()
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
    async def get_streak_for_user_async(
        session: AsyncSession, user_id: int
    ) -> AResult[int]:
        from backend.core.access.statsAccess import StatsAccess as sa

        return await sa.get_current_streak_async(session=session, user_id=user_id)
