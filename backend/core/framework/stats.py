from datetime import datetime, timedelta
from typing import Literal

from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.access.statsAccess import StatsAccess
from backend.core.responses.userStatsResponse import UserStatsResponse
from backend.utils.logger import getLogger

logger = getLogger(__name__)

RangeLiteral = Literal["7d", "30d", "1y", "custom"]


def _parse_range(
    range_value: RangeLiteral,
    custom_start: str | None = None,
    custom_end: str | None = None,
) -> tuple[datetime, datetime]:
    end_date = datetime.utcnow()
    if range_value == "7d":
        start_date = end_date - timedelta(days=7)
    elif range_value == "30d":
        start_date = end_date - timedelta(days=30)
    elif range_value == "1y":
        start_date = end_date - timedelta(days=365)
    elif range_value == "custom" and custom_start and custom_end:
        start_date = datetime.fromisoformat(custom_start)
        end_date = datetime.fromisoformat(custom_end)
    else:
        start_date = end_date - timedelta(days=7)

    return start_date, end_date


def _get_group_by(range_value: RangeLiteral) -> str:
    if range_value == "7d":
        return "day"
    elif range_value == "30d":
        return "week"
    elif range_value == "1y":
        return "month"
    elif range_value == "custom":
        return "week"
    return "day"


class Stats:
    @staticmethod
    async def get_user_stats_async(
        session: AsyncSession,
        user_id: int,
        range_value: RangeLiteral,
        custom_start: str | None = None,
        custom_end: str | None = None,
    ) -> AResult[UserStatsResponse]:
        start_date, end_date = _parse_range(range_value, custom_start, custom_end)
        group_by = _get_group_by(range_value)

        a_result = await StatsAccess.get_user_stats_async(
            session=session,
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            group_by=group_by,
        )

        if a_result.is_not_ok():
            logger.error(f"Error getting user stats: {a_result.message()}", exc_info=True)
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())
