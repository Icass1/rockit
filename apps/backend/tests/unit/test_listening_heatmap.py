"""Replay counts must preserve gaps and exact half-open interval boundaries."""

from unittest.mock import AsyncMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.mediaAccess import MediaAccess
from core.framework.media.media import Media
from result import Result, ResultCode

pytestmark = pytest.mark.unit


@pytest.mark.parametrize(
    ("intervals", "expected"),
    [
        ([], []),
        ([(0, 1000), (1000, 2000)], [(0, 2000, 1)]),
        ([(0, 3000), (1000, 2000)], [(0, 1000, 1), (1000, 2000, 2), (2000, 3000, 1)]),
        ([(0, 1000), (2000, 3000)], [(0, 1000, 1), (2000, 3000, 1)]),
        ([(-500, 1000), (5, 5), (3000, 2000)], [(0, 1000, 1)]),
        ([(1, 3), (1, 3), (2, 4)], [(1, 2, 2), (2, 3, 3), (3, 4, 1)]),
    ],
)
async def test_exact_replay_counts(
    monkeypatch: pytest.MonkeyPatch,
    intervals: list[tuple[int, int]],
    expected: list[tuple[int, int, int]],
) -> None:
    read = AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=intervals))
    monkeypatch.setattr(MediaAccess, "get_listening_intervals_async", read)
    session = AsyncMock(spec=AsyncSession)
    response = await Media.get_listening_heatmap_async(
        session=session, user_id=7, public_id="track-uuid"
    )
    assert response.is_ok()
    assert [(s.startMs, s.endMs, s.count) for s in response.result().segments] == expected
    read.assert_awaited_once_with(session=session, user_id=7, public_id="track-uuid")


async def test_history_failure_is_not_empty_success(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        MediaAccess,
        "get_listening_intervals_async",
        AsyncMock(return_value=Result(code=ResultCode.GENERAL_ERROR, message="Unavailable")),
    )
    response = await Media.get_listening_heatmap_async(
        session=AsyncMock(spec=AsyncSession), user_id=7, public_id="track-uuid"
    )
    assert response.is_not_ok()


async def test_access_scopes_history_to_authenticated_user_and_media() -> None:
    session = AsyncMock()
    session.execute.return_value = [(0, 1000)]
    response = await MediaAccess.get_listening_intervals_async(
        session=session, user_id=7, public_id="track-uuid"
    )
    assert response.is_ok()
    statement = session.execute.call_args.kwargs["statement"]
    parameters = statement.compile().params
    assert parameters == {"public_id_1": "track-uuid", "user_id_1": 7}
