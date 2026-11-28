"""The two album query phases must propagate failures and roll back the session."""

from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.statsAccess import StatsAccess
from core.access.statsV2Access import StatsV2Access


@pytest.mark.parametrize("access_class", [StatsAccess, StatsV2Access])
@pytest.mark.parametrize("failing_phase", [1, 2])
async def test_album_query_failures_return_an_error_and_roll_back(
    monkeypatch: pytest.MonkeyPatch,
    failing_phase: int,
    access_class: type[StatsAccess] | type[StatsV2Access],
) -> None:
    monkeypatch.setattr(
        f"{access_class.__module__}._get_album_info_cte",
        Mock(return_value="album_info AS (SELECT 1)"),
    )
    totals = Mock()
    totals.fetchall.return_value = [
        SimpleNamespace(
            album_public_id="album",
            album_name="Album",
            album_image_id=1,
            media_id=2,
            total_ms=30000,
            play_count=3,
        )
    ]
    session = AsyncMock(spec=AsyncSession)
    session.execute.side_effect = (
        [RuntimeError("Database unavailable")]
        if failing_phase == 1
        else [totals, RuntimeError("Database unavailable")]
    )

    result = await access_class.get_top_albums_async(
        session=session,
        user_id=42,
        start_date=datetime(2026, 11, 17, tzinfo=UTC),
        end_date=datetime(2026, 11, 24, tzinfo=UTC),
    )

    assert result.is_not_ok()
    assert session.execute.await_count == failing_phase
    session.rollback.assert_awaited_once()
