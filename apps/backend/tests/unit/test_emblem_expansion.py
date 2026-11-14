"""Additional family evidence, batch boundaries and zero-history behavior."""

from types import SimpleNamespace
from typing import cast
from unittest.mock import AsyncMock

import pytest
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.friend.listeningCollectionMetricsAccess import (
    ListeningCollectionMetricsAccess,
    history_metrics_statement,
    library_metrics_statement,
    sharing_metrics_statement,
)
from core.framework.friend.listeningBadgeCatalog import LISTENING_BADGES
from core.framework.friend.listeningBadgeExpansion import EXPANDED_BADGE_FAMILIES
from core.framework.friend.listeningBadges import ListeningBadges, badge_metrics, badge_response
from core.framework.models.listeningRewards import ListeningRewardSummary
from result import Result, ResultCode


def test_every_new_family_has_real_evidence_and_a_zero_default() -> None:
    statements = [
        history_metrics_statement(user_ids=[3]),
        library_metrics_statement(user_ids=[3]),
        sharing_metrics_statement(user_ids=[3]),
    ]
    names = {
        name
        for statement in statements
        for name in statement.selected_columns.keys()
        if name != "user_id"
    }
    scopes = {family.scope for family in EXPANDED_BADGE_FAMILIES}
    assert len(names) == len(scopes) == 48
    assert names == scopes
    metrics = badge_metrics(summary=ListeningRewardSummary(), streak=0)
    assert all(metrics[scope] == 0 for scope in scopes)
    assert not any(metrics[b.metric or b.scope] >= b.target for b in LISTENING_BADGES)


def test_metrics_do_not_override_verified_time_or_infer_local_timezone() -> None:
    summary = ListeningRewardSummary(
        total_ms=60000,
        additional_metrics={"total": 9999, "morning": 25, "library_albums": 10},
    )
    metrics = badge_metrics(summary=summary, streak=0)
    assert metrics["total"] == 1
    morning = next(b for b in LISTENING_BADGES if b.key == "morning_milestone_25")
    assert badge_response(badge=morning, metrics=metrics).current == 25
    sql = str(
        history_metrics_statement(user_ids=[3]).compile(
            dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True}
        )
    )
    assert "timezone('UTC'" in sql
    assert "EXTRACT(isodow" in sql
    assert "date_trunc('week'" in sql
    assert "date_trunc('month'" in sql
    assert "count(distinct" in sql.lower()
    assert "plays >= 10" in sql and "plays >= 50" in sql
    assert "user_id IN (3)" in sql


def test_library_and_sharing_count_distinct_objects_and_both_directions() -> None:
    library = str(library_metrics_statement(user_ids=[3]).compile(dialect=postgresql.dialect()))
    sharing = str(sharing_metrics_statement(user_ids=[3]).compile(dialect=postgresql.dialect()))
    assert "user_library_media.user_id IN" in library
    assert "count(distinct(core.media.media_type_key))" in library.lower()
    assert "UNION ALL" in sharing
    assert "sender_user_id IN" in sharing and "recipient_user_id IN" in sharing
    assert "outgoing IS true" in sharing and "outgoing IS false" in sharing
    assert (
        "distinct((recommendation_edges.peer_id, recommendation_edges.media_id))" in sharing.lower()
    )


@pytest.mark.parametrize("users", [[1], list(range(1, 101))])
async def test_additional_evidence_is_three_queries_for_any_batch_size(users: list[int]) -> None:
    session = SimpleNamespace(
        execute=AsyncMock(
            side_effect=[
                SimpleNamespace(mappings=lambda: [{"user_id": 1, "repeats": 11, "morning": 4}]),
                SimpleNamespace(mappings=lambda: [{"user_id": 1, "library_albums": 2}]),
                SimpleNamespace(mappings=lambda: [{"user_id": 1, "curators": 3}]),
            ]
        )
    )
    result = await ListeningCollectionMetricsAccess.get_async(
        session=cast(AsyncSession, session), user_ids=users
    )
    assert result.is_ok()
    assert result.result()[1] == {"repeats": 11, "morning": 4, "library_albums": 2, "curators": 3}
    assert session.execute.await_count == 3
    if len(users) > 1:
        assert result.result()[2] == {}


async def test_empty_batch_does_not_query() -> None:
    session = SimpleNamespace(execute=AsyncMock())
    result = await ListeningCollectionMetricsAccess.get_async(
        session=cast(AsyncSession, session), user_ids=[]
    )
    assert result.is_ok() and result.result() == {}
    session.execute.assert_not_awaited()


async def test_awarded_collection_badges_survive_removal_and_old_families_keep_their_dates(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from datetime import UTC, datetime

    from core.access.friend.listeningBadgesAccess import ListeningBadgesAccess

    date = datetime(2026, 1, 1, tzinfo=UTC)
    owned = {1: {"library_albums_milestone_10": date, "ignition": date}}
    monkeypatch.setattr(
        ListeningBadgesAccess,
        "get_for_users_async",
        AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=owned)),
    )
    award = AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result={}))
    monkeypatch.setattr(ListeningBadgesAccess, "award_many_async", award)
    result = await ListeningBadges.synchronize_async(
        session=cast(AsyncSession, object()),
        user_ids=[1],
        summaries={1: ListeningRewardSummary(additional_metrics={"library_albums": 0})},
        streaks={},
    )
    assert result.is_ok() and result.result()[1] == owned[1]
    assert award.call_args is not None
    assert (1, "library_albums_milestone_10") not in award.call_args.kwargs["awards"]
