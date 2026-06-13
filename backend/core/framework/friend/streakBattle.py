import uuid
from typing import Any, Dict

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.access.db.ormModels.friend.streakBattle import StreakBattleRow
from backend.core.utils.safeAsyncCall import safe_async

from backend.core.access.db.ormModels.friend.streakBattle import StreakBattleRow
from sqlalchemy import Result, Select, select

logger = getLogger(__name__)


def _get_user_streak_sql(user_id: int) -> str:
    return f"""
    SELECT COUNT(*) AS streak
    FROM (
        SELECT DISTINCT DATE(date_added) AS listen_date
        FROM core.user_media_listened
        WHERE user_id = {user_id}
        ORDER BY listen_date DESC
    ) dates
    WHERE dates.listen_date >= (
        SELECT MAX(listen_date) - (
            SELECT COUNT(*) FROM (
                SELECT DISTINCT DATE(date_added) AS d
                FROM core.user_media_listened
                WHERE user_id = {user_id}
                ORDER BY d DESC
            ) sub
            WHERE d >= (
                SELECT MIN(listen_date) FROM (
                    SELECT DISTINCT DATE(date_added) AS listen_date
                    FROM core.user_media_listened
                    WHERE user_id = {user_id}
                    ORDER BY listen_date DESC
                    LIMIT 2
                ) last_two
                HAVING MAX(listen_date) - MIN(listen_date) <= 1
            )
        )
        FROM (
            SELECT DISTINCT DATE(date_added) AS listen_date
            FROM core.user_media_listened
            WHERE user_id = {user_id}
            ORDER BY listen_date DESC
        ) ld
    )
    """


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
    def _calculate_streak(dates: list) -> int:
        if not dates:
            return 0
        today = dates[0]
        from datetime import date, timedelta
        if isinstance(today, str):
            from datetime import datetime
            today = datetime.fromisoformat(today).date()
        yesterday = today - timedelta(days=1)
        if dates[0] < yesterday:
            return 0
        streak = 0
        expected = dates[0]
        for d in dates:
            if isinstance(d, str):
                from datetime import datetime
                d = datetime.fromisoformat(d).date()
            if d == expected:
                streak += 1
                expected = d - timedelta(days=1)
            else:
                break
        return streak

    @staticmethod
    async def get_streak_for_user_async(
        session: AsyncSession, user_id: int
    ) -> AResult[int]:
        from backend.core.access.statsAccess import StatsAccess as sa
        return await sa.get_current_streak_async(session=session, user_id=user_id)
