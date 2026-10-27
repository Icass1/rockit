"""Persisted reward credit must survive profile reads and transaction retries."""

from datetime import datetime, timedelta, timezone
from unittest.mock import Mock
import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.access.db.ormModels.friend.listeningXpEvent import ListeningXpEventRow
from backend.core.access.db.ormModels.friend.listeningBadge import ListeningBadgeRow
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
    assert (
        await database.scalar(select(func.count()).select_from(ListeningBadgeRow)) == 6
    )
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
    assert (
        await database.scalar(select(func.count()).select_from(ListeningBadgeRow)) == 6
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
    assert (
        await database.scalar(select(func.count()).select_from(ListeningBadgeRow)) == 6
    )
    profiles = await UserLevelAccess.get_user_levels_async(database, [1])
    assert profiles.is_ok() and profiles.result()[0].xp == 20
    assert (
        await database.scalar(select(func.count()).select_from(ListeningXpEventRow))
        == 1
    )


async def test_catalogue_backfill_is_batched_and_idempotent(
    database: AsyncSession,
) -> None:
    from backend.core.framework.friend.listeningBadgeCatalog import LISTENING_BADGES
    from backend.core.framework.friend.listeningBadges import (
        ListeningBadges,
        badge_current,
    )
    from backend.core.framework.models.listeningRewards import ListeningRewardSummary

    assert (
        len(LISTENING_BADGES) == len({badge.key for badge in LISTENING_BADGES}) == 115
    )
    summary = ListeningRewardSummary(
        total_ms=900000,
        session_ms=120000,
        recorded_listens=10,
        unique_recordings=5,
        recommendations=3,
    )
    expected = {
        badge.key
        for badge in LISTENING_BADGES
        if badge_current(badge, summary, 3) >= badge.target
    }
    first = await ListeningBadges.synchronize_async(database, [1], {1: summary}, {1: 3})
    assert first.is_ok(), first.info()
    assert set(first.result()[1]) == expected
    second = await ListeningBadges.synchronize_async(
        database, [1], {1: summary}, {1: 3}
    )
    assert second.is_ok(), second.info()
    assert second.result() == first.result()
