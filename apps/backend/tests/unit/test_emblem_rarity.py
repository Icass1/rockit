"""Global rarity uses persisted awards and the whole registered population."""

from datetime import UTC, datetime
from types import SimpleNamespace
from typing import cast
from unittest.mock import AsyncMock

import pytest
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.friend.listeningBadgesAccess import ListeningBadgesAccess
from core.framework.friend.levels import Levels
from core.framework.friend.listeningBadgeCatalog import LISTENING_BADGES
from core.framework.models.listeningRewards import ListeningRewardSummary
from result import Result, ResultCode


@pytest.mark.parametrize("total,counts", [(0, {}), (8, {}), (8, {"ignition": 1, "orbit": 3})])
async def test_population_is_one_snapshot_and_includes_users_without_awards(
    total: int, counts: dict[str, int]
) -> None:
    rows = [
        SimpleNamespace(total=total, badge_key=key, holders=count) for key, count in counts.items()
    ] or [SimpleNamespace(total=total, badge_key=None, holders=None)]
    session = SimpleNamespace(execute=AsyncMock(return_value=SimpleNamespace(all=lambda: rows)))
    result = await ListeningBadgesAccess.get_population_async(session=cast(AsyncSession, session))
    assert result.is_ok() and result.result() == (total, counts)
    session.execute.assert_awaited_once()
    sql = str(session.execute.call_args.args[0].compile(dialect=postgresql.dialect())).lower()
    assert 'select count(core."user".id)' in sql
    assert "count(distinct(core.listening_badge.user_id))" in sql
    assert "left outer join emblem_holders on true" in sql
    assert "group by core.listening_badge.badge_key" in sql
    assert "user_id in" not in sql


@pytest.mark.parametrize("user_count", [1, 25])
async def test_profiles_share_global_rarity_after_synchronizing_their_awards(
    monkeypatch: pytest.MonkeyPatch, user_count: int
) -> None:
    from core.access import statsAccess
    from core.access.friend.friendAccess import FriendAccess
    from core.access.friend.listeningRewardsAccess import ListeningRewardsAccess
    from core.access.friend.userLevelAccess import UserLevelAccess
    from core.framework.friend.listeningBadges import ListeningBadges
    from core.framework.media.image import Image

    def ok[T](value: T) -> Result[T]:
        return Result(code=ResultCode.OK, message="OK", result=value)

    ids = list(range(1, user_count + 1))
    users = [
        SimpleNamespace(id=i, public_id=f"profile-{i}", username=f"Listener {i}", image=None)
        for i in ids
    ]
    levels = [SimpleNamespace(user_id=i, level=1, xp=0) for i in ids]
    for owner, name, value in [
        (FriendAccess, "get_users_async", users),
        (UserLevelAccess, "get_user_levels_async", levels),
        (UserLevelAccess, "get_level_configs_async", []),
        (statsAccess, "get_streaks_for_users_async", {}),
        (ListeningRewardsAccess, "get_summaries_async", {i: ListeningRewardSummary() for i in ids}),
        (Image, "get_internal_image_url_async", ""),
    ]:
        monkeypatch.setattr(owner, name, AsyncMock(return_value=ok(value)))
    award = LISTENING_BADGES[0]
    synchronize = AsyncMock(return_value=ok({1: {award.key: datetime(2026, 1, 1, tzinfo=UTC)}}))
    monkeypatch.setattr(ListeningBadges, "synchronize_async", synchronize)

    async def population(session: AsyncSession) -> Result[tuple[int, dict[str, int]]]:
        synchronize.assert_awaited_once()
        return ok((100, {award.key: 3}))

    population_mock = AsyncMock(side_effect=population)
    monkeypatch.setattr(ListeningBadgesAccess, "get_population_async", population_mock)
    result = await Levels.get_profiles_async(session=cast(AsyncSession, object()), user_ids=ids)
    assert result.is_ok()
    population_mock.assert_awaited_once()
    assert len(result.result()) == user_count
    for profile in result.result():
        assert profile.listeningBadges[0].holderPercentage == 3.0
        assert profile.listeningBadges[1].holderPercentage == 0.0
