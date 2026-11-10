"""Local calendar ranges and timeline buckets must agree, including fractional offsets."""

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from typing import cast
from unittest.mock import AsyncMock, Mock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.statsV2Access import StatsV2Access
from core.requests.userStatsV2Request import UserStatsV2Request
from core.utils import statsRange


@pytest.mark.parametrize("offset", [-330, -60, 0, 480])
@pytest.mark.parametrize("range_value, days", [("today", 1), ("7d", 7), ("30d", 30)])
def test_ranges_include_the_current_local_day(
    monkeypatch: pytest.MonkeyPatch, offset: int, range_value: str, days: int
) -> None:
    now = datetime(2026, 11, 10, 23, 30, tzinfo=UTC)
    clock = Mock()
    clock.now.return_value = now
    monkeypatch.setattr(statsRange, "datetime", clock)

    start, end = statsRange.parse_range(range_value=range_value, timezone_offset_minutes=offset)

    local_now = now - timedelta(minutes=offset)
    local_end = local_now.replace(hour=0, minute=0, second=0) + timedelta(days=1)
    assert end == local_end + timedelta(minutes=offset)
    assert end - start == timedelta(days=days)
    assert start <= now < end
    if range_value == "today":
        assert statsRange.get_group_by(range_value=range_value) == "hour"
        assert UserStatsV2Request(range=range_value).range == "today"


@pytest.mark.parametrize("offset", [-330, -60, 0, 480])
@pytest.mark.parametrize("group_by, days, count", [("hour", 1, 24), ("day", 7, 7), ("week", 28, 4)])
async def test_timeline_keeps_listening_data_in_local_buckets(
    monkeypatch: pytest.MonkeyPatch, offset: int, group_by: str, days: int, count: int
) -> None:
    monkeypatch.setattr(
        "core.access.statsV2Access._get_media_info_cte", lambda: "media_info AS (SELECT 1)"
    )
    # Monday midnight in the user's calendar; SQL returns local, naive period starts.
    local_start = datetime(2026, 11, 2)
    start = local_start.replace(tzinfo=UTC) + timedelta(minutes=offset)
    end = start + timedelta(days=days)
    rows = Mock()
    rows.fetchall.return_value = [SimpleNamespace(period_start=local_start, minutes=211.2)]
    session = Mock(spec=AsyncSession)
    session.execute = AsyncMock(return_value=rows)

    result = await StatsV2Access.get_minutes_by_period_async(
        session=cast(AsyncSession, session),
        user_id=42,
        start_date=start,
        end_date=end,
        group_by=group_by,
        timezone_offset_minutes=offset,
    )

    assert result.is_ok(), result.info()
    entries = result.result()
    assert len(entries) == count
    assert entries[0].minutes == 211.2
    assert sum(entry.minutes for entry in entries) == 211.2
    assert entries[0].start == start
    assert entries[-1].end == end
    params = session.execute.call_args.args[1]
    assert params["start_date"] == start
    assert params["timezone_offset_minutes"] == offset
