"""Unit coverage for commit-triggered social and notification WebSocket updates."""

import asyncio
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock

import pytest

from core.access.db.ormModels.notification import NotificationRow
from core.framework.friend import notifications
from core.framework.websocket.webSocketManager import WebSocketManager
from core.responses.notificationResponses import NotificationStateMessage
from core.utils.afterCommit import run_after_commit
from result import Result, ResultCode


def test_social_updates_are_coalesced_and_sent_after_commit(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = MagicMock()
    session.info = {}
    send_snapshot = AsyncMock()
    monkeypatch.setattr(
        "core.framework.websocket.webSocketManager.ws_manager.send_social_snapshot_async",
        send_snapshot,
    )

    notifications.notify_after_commit(session, [3, 4])
    notifications.notify_after_commit(session, [3], kind="social_refresh")

    assert len(session.info["after_commit"]) == 1
    assert session.info["social_events"] == {
        (3, "social_changed"),
        (4, "social_changed"),
        (3, "social_refresh"),
    }
    send_snapshot.assert_not_awaited()

    asyncio.run(run_after_commit(session))

    assert send_snapshot.await_count == 3
    send_snapshot.assert_any_await(user_id=3)
    send_snapshot.assert_any_await(user_id=4)
    assert "social_events" not in session.info


def test_notification_state_sends_counts_from_notification_access(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manager = WebSocketManager()
    websocket = AsyncMock()

    @asynccontextmanager
    async def session_scope_async() -> AsyncGenerator[object, None]:
        yield object()

    monkeypatch.setattr("core.db_context.session_scope_async", session_scope_async)
    monkeypatch.setattr(
        "core.access.notificationAccess.NotificationAccess.list_async",
        AsyncMock(
            return_value=Result[tuple[list[NotificationRow], int, int]](
                ResultCode.OK, "OK", result=([], 2, 7)
            )
        ),
    )

    asyncio.run(manager.send_notification_state_async(user_id=8, websocket=websocket))

    websocket.send_text.assert_awaited_once_with(
        NotificationStateMessage(unreadCount=2, totalCount=7).model_dump_json()
    )


def test_notification_count_failure_does_not_send_a_stale_state(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = MagicMock()
    session.info = {"notification_events": {12}}

    @asynccontextmanager
    async def session_scope_async() -> AsyncGenerator[object, None]:
        yield object()

    monkeypatch.setattr("core.db_context.session_scope_async", session_scope_async)
    monkeypatch.setattr(
        "core.access.notificationAccess.NotificationAccess.list_async",
        AsyncMock(return_value=Result(ResultCode.GENERAL_ERROR, "database unavailable")),
    )
    send = AsyncMock()
    monkeypatch.setattr(
        "core.framework.websocket.webSocketManager.ws_manager.send_to_user_async", send
    )

    asyncio.run(notifications.deliver_notification_events(session))

    send.assert_not_awaited()
    assert "notification_events" not in session.info
