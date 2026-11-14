"""Fast catalog, projection, calendar, SQL-batch and persisted-award contracts."""

import hashlib
import json
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path
from types import SimpleNamespace
from typing import cast
from unittest.mock import AsyncMock

import pytest
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.friend.listeningBadgesAccess import ListeningBadgesAccess
from core.access.friend.listeningRewardsAccess import ListeningRewardsAccess
from core.framework.friend.listeningBadgeCatalog import LISTENING_BADGES
from core.framework.friend.listeningBadges import ListeningBadges, badge_metrics, badge_response
from core.framework.models.listeningRewards import ListeningRewardSummary
from result import Result, ResultCode


def test_catalog_expands_to_64_families_without_changing_existing_awards() -> None:
    assert len(LISTENING_BADGES) == len({badge.key for badge in LISTENING_BADGES}) == 903
    from core.framework.friend.listeningBadgeExpansion import EXPANDED_BADGE_FAMILIES

    new_scopes = {family.scope for family in EXPANDED_BADGE_FAMILIES}
    previous = sorted(
        (
            b.key,
            b.scope,
            b.target,
            b.title_key,
            b.description_key,
            b.visual_variant,
            b.tier,
            b.league,
            b.secret,
            b.metric,
        )
        for b in LISTENING_BADGES
        if b.scope not in new_scopes
    )
    assert len(previous) == 615
    assert (
        hashlib.sha256(json.dumps(previous, separators=(",", ":")).encode()).hexdigest()
        == "45593b2a9323e51c910b4605194ba2fb54d2e9f15b672ddbcfc3b67440070209"
    )
    for family in EXPANDED_BADGE_FAMILIES:
        ranks = [badge for badge in LISTENING_BADGES if badge.scope == family.scope]
        assert len(ranks) == 6
        assert [b.target for b in ranks] == sorted(set(b.target for b in ranks))
        assert [b.league for b in ranks] == [
            "bronze",
            "silver",
            "gold",
            "platinum",
            "diamond",
            "legend",
        ]
    originals = sorted(
        (badge.key, badge.scope, badge.target, badge.title_key)
        for badge in LISTENING_BADGES
        if "_milestone_" not in badge.key and not badge.secret
    )
    assert len(originals) == 115
    assert (
        hashlib.sha256(json.dumps(originals, separators=(",", ":")).encode()).hexdigest()
        == "404d4a5e0ff5149906fa44040ba1e9dd893fe16a3caf997005f71f4d22c1968c"
    )
    assert len({badge.scope for badge in LISTENING_BADGES}) == 64
    assert len({badge.league for badge in LISTENING_BADGES}) == 6
    assert sum(badge.secret for badge in LISTENING_BADGES) == 25
    for badge in LISTENING_BADGES:
        assert badge.target > 0
        assert badge.metric != "secrets"
        assert len(badge.key) < 64


def test_catalog_copy_exists_in_every_workbook_language() -> None:
    root = Path(__file__).resolve().parents[4]
    languages = json.loads(
        subprocess.check_output(
            [
                sys.executable,
                str(root / "scripts/export-vocabulary-fixture.py"),
                "--workbook",
                str(root / "Vocabulary.xlsx"),
            ],
            text=True,
        )
    )
    keys = {key for badge in LISTENING_BADGES for key in (badge.title_key, badge.description_key)}
    keys |= {f"FRIENDS_BADGE_FAMILY_{badge.scope.upper()}" for badge in LISTENING_BADGES}
    keys |= {f"FRIENDS_BADGE_LEAGUE_{badge.league.upper()}" for badge in LISTENING_BADGES}
    keys |= {
        f"MEDAL_{kind}_{badge.scope.upper()}"
        for badge in LISTENING_BADGES
        for kind in ("NAME", "STORY")
    }
    keys.add("MEDAL_RARITY")
    for language, copy in languages.items():
        assert not (keys - copy.keys()), language


def test_anniversaries_use_the_calendar_and_require_real_usage() -> None:
    joined = datetime(2020, 2, 29, 10, tzinfo=UTC)
    summary = ListeningRewardSummary(joined_at=joined, recorded_listens=1)
    before = badge_metrics(summary, 0, datetime(2021, 2, 28, 9, 59, tzinfo=UTC))
    after = badge_metrics(summary, 0, datetime(2021, 2, 28, 10, tzinfo=UTC))
    leap = badge_metrics(summary, 0, datetime(2024, 2, 28, 10, tzinfo=UTC))
    assert before["anniversary"] == 0
    assert after["anniversary"] == 1
    assert leap["anniversary"] == 3
    assert badge_metrics(ListeningRewardSummary(joined_at=joined), 0)["anniversary"] == 0
    assert badge_metrics(summary, 0, datetime(2019, 1, 1, tzinfo=UTC))["tenure"] == 0
    assert badge_metrics(summary, 0, datetime(2040, 2, 29, 10, tzinfo=UTC))["anniversary"] == 20


def test_secret_objectives_are_redacted_until_persisted_unlock() -> None:
    secret = next(badge for badge in LISTENING_BADGES if badge.key == "secret_answer_42")
    metrics = badge_metrics(ListeningRewardSummary(unique_recordings=100), 0)
    hidden = badge_response(secret, metrics)
    assert hidden.secret
    assert hidden.titleKey == "FRIENDS_BADGE_SECRET_HIDDEN"
    assert hidden.target == hidden.current == 0
    earned_at = datetime(2026, 1, 1, tzinfo=UTC)
    revealed = badge_response(secret, metrics, earned_at)
    assert revealed.titleKey == secret.title_key
    assert revealed.target == 42 and revealed.current == 100
    assert revealed.earnedAt == earned_at


async def test_catalog_synchronization_is_batched_and_preserves_old_award_dates(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    old_date = datetime(2020, 1, 1, tzinfo=UTC)
    loaded = AsyncMock(
        return_value=Result(code=ResultCode.OK, message="OK", result={1: {"ignition": old_date}})
    )
    granted = AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result={}))
    monkeypatch.setattr(ListeningBadgesAccess, "get_for_users_async", loaded)
    monkeypatch.setattr(ListeningBadgesAccess, "award_many_async", granted)
    summaries = {
        user: ListeningRewardSummary(
            total_ms=1337 * 60000, recorded_listens=1001, unique_recordings=43
        )
        for user in range(1, 101)
    }
    result = await ListeningBadges.synchronize_async(
        cast(AsyncSession, object()), list(summaries), summaries, {}
    )
    assert result.is_ok() and result.result()[1]["ignition"] == old_date
    assert loaded.await_count == granted.await_count == 1
    assert granted.call_args is not None
    awards: list[tuple[int, str]] = granted.call_args.kwargs["awards"]
    assert (1, "ignition") not in awards
    assert (1, "secret_answer_42") in awards
    # An owned ten-minute session remains proof of its lower tiers after a pause.
    assert (1, "session_01") in awards
    assert len(awards) == len(set(awards))


async def test_recorded_habits_and_membership_share_seven_batch_queries() -> None:
    joined = datetime(2020, 1, 1, tzinfo=UTC)
    session = SimpleNamespace(
        execute=AsyncMock(
            side_effect=[
                [(1, joined, None), (2, joined, None)],
                [(1, 10, 8, 3, 2, 4, 5, 1)],
                [(1, 2)],
                [(1, 1)],
                SimpleNamespace(mappings=lambda: list[dict[str, int]]()),
                SimpleNamespace(mappings=lambda: list[dict[str, int]]()),
                SimpleNamespace(mappings=lambda: list[dict[str, int]]()),
            ]
        )
    )
    result = await ListeningRewardsAccess.get_summaries_async(
        cast(AsyncSession, session), [1, 2], datetime(2026, 1, 1, tzinfo=UTC)
    )
    assert result.is_ok()
    first = result.result()[1]
    assert (first.active_days, first.night_listens, first.early_listens, first.weekend_listens) == (
        3,
        2,
        4,
        5,
    )
    assert (first.recorded_listens, first.unique_recordings, first.videos) == (10, 8, 1)
    assert first.joined_at == joined
    assert result.result()[2].recorded_listens == 0
    assert session.execute.await_count == 7
    statement = session.execute.call_args_list[1].args[0]
    sql = str(statement.compile(dialect=postgresql.dialect()))
    assert "timezone" in sql and "isodow" in sql and "count(distinct" in sql.lower()
