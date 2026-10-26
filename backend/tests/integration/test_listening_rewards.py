"""Persisted reward credit must survive profile reads and transaction retries."""

from datetime import datetime, timedelta, timezone
from unittest.mock import Mock
import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.access.db.ormModels.friend.listeningXpEvent import ListeningXpEventRow
from backend.core.access.friend.userLevelAccess import UserLevelAccess
from backend.core.framework.friend.listeningRewards import ListeningRewards
import backend.core.framework.friend.listeningRewards as reward_module

pytestmark = pytest.mark.integration


async def test_timed_xp_is_not_recomputed_or_replayed(
    database: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    clock = Mock()
    clock.now.return_value = now
    monkeypatch.setattr(reward_module, "datetime", clock)
    for minute in range(11):
        clock.now.return_value = now + timedelta(minutes=minute)
        result = await ListeningRewards.observe_async(
            database, 1, "occurrence", minute * 60000, baseline=minute == 0
        )
        assert result.is_ok(), result.info()
    profiles = await UserLevelAccess.get_user_levels_async(database, [1])
    assert profiles.is_ok() and profiles.result()[0].xp == 20
    repeated = await ListeningRewards.observe_async(database, 1, "occurrence", 600000)
    assert repeated.is_ok() and not repeated.result()
    clock.now.return_value = now + timedelta(minutes=10, seconds=1)
    seek = await ListeningRewards.observe_async(
        database, 1, "occurrence", 3600000, baseline=True
    )
    assert seek.is_ok() and not seek.result()
    assert (
        await database.scalar(select(func.count()).select_from(ListeningXpEventRow))
        == 1
    )
    profiles = await UserLevelAccess.get_user_levels_async(database, [1])
    assert profiles.is_ok() and profiles.result()[0].xp == 20


async def test_reward_and_cursor_rollback_together(
    database: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    clock = Mock()
    monkeypatch.setattr(reward_module, "datetime", clock)
    for minute in range(10):
        clock.now.return_value = now + timedelta(minutes=minute)
        result = await ListeningRewards.observe_async(
            database, 1, "occurrence", minute * 60000, baseline=minute == 0
        )
        assert result.is_ok(), result.info()
    await database.commit()
    clock.now.return_value = now + timedelta(minutes=10)
    earned = await ListeningRewards.observe_async(database, 1, "occurrence", 600000)
    assert earned.is_ok() and earned.result()
    await database.rollback()
    replay = await ListeningRewards.observe_async(database, 1, "occurrence", 600000)
    assert replay.is_ok() and replay.result()
    profiles = await UserLevelAccess.get_user_levels_async(database, [1])
    assert profiles.is_ok() and profiles.result()[0].xp == 20
    assert (
        await database.scalar(select(func.count()).select_from(ListeningXpEventRow))
        == 1
    )
