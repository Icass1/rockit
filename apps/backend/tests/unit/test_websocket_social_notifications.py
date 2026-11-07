"""Unit coverage for commit-triggered social and notification WebSocket updates."""

import asyncio
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from core.access.db.ormModels.notification import NotificationRow
from core.framework.friend import notifications
from core.framework.friend.listenTogether import ListenTogether
from core.framework.websocket.webSocketManager import WebSocketManager
from core.responses.friend.listenTogetherResponse import (
    ListenTogetherListResponse,
    ListenTogetherSyncMessage,
)
from core.responses.mediaResponse import MediaResponse
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


def test_session_updates_are_coalesced_and_delivered_after_commit(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = MagicMock()
    session.info = {}
    send_snapshot = AsyncMock()
    monkeypatch.setattr(
        "core.framework.websocket.webSocketManager.ws_manager.send_listen_together_snapshot_async",
        send_snapshot,
    )
    notifications.notify_after_commit(session=session, user_ids=[3, 4], kind="listen_together_sync")
    notifications.notify_after_commit(session=session, user_ids=[3], kind="listen_together_sync")
    send_snapshot.assert_not_awaited()

    asyncio.run(run_after_commit(session=session))

    assert send_snapshot.await_count == 2
    send_snapshot.assert_any_await(user_id=3)
    send_snapshot.assert_any_await(user_id=4)
    assert "social_events" not in session.info


@pytest.mark.parametrize("direct_socket", [True, False])
def test_session_snapshot_resolves_state_for_the_authenticated_recipient(
    monkeypatch: pytest.MonkeyPatch, direct_socket: bool
) -> None:
    manager = WebSocketManager()
    session = MagicMock()
    websocket = AsyncMock()

    @asynccontextmanager
    async def session_scope_async() -> AsyncGenerator[object, None]:
        yield session

    monkeypatch.setattr("core.db_context.session_scope_async", session_scope_async)
    load = AsyncMock(return_value=Result(ResultCode.OK, "OK", result=[]))
    build = AsyncMock(
        return_value=Result(ResultCode.OK, "OK", result=ListenTogetherListResponse(sessions=[]))
    )
    monkeypatch.setattr(
        "core.framework.friend.listenTogether.ListenTogether.get_active_sessions_async", load
    )
    monkeypatch.setattr(
        "core.framework.friend.listenTogether.ListenTogether.build_sessions_response_async", build
    )
    send = AsyncMock()
    monkeypatch.setattr(manager, "send_to_user_async", send)

    asyncio.run(
        manager.send_listen_together_snapshot_async(
            user_id=8, websocket=websocket if direct_socket else None
        )
    )

    load.assert_awaited_once_with(session=session, user_id=8)
    build.assert_awaited_once_with(session=session, user_id=8, rows=[])
    message = ListenTogetherSyncMessage(sessions=[])
    if direct_socket:
        websocket.send_text.assert_awaited_once_with(message.model_dump_json())
        send.assert_not_awaited()
    else:
        send.assert_awaited_once_with(user_id=8, message=message)


def test_session_snapshot_failure_does_not_clear_client_state(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manager = WebSocketManager()
    websocket = AsyncMock()

    @asynccontextmanager
    async def session_scope_async() -> AsyncGenerator[object, None]:
        yield object()

    monkeypatch.setattr("core.db_context.session_scope_async", session_scope_async)
    monkeypatch.setattr(
        "core.framework.friend.listenTogether.ListenTogether.get_active_sessions_async",
        AsyncMock(return_value=Result(ResultCode.GENERAL_ERROR, "database unavailable")),
    )

    asyncio.run(manager.send_listen_together_snapshot_async(user_id=8, websocket=websocket))

    websocket.send_text.assert_not_awaited()


@pytest.mark.parametrize("user_id", [3, 4])
@pytest.mark.parametrize("visible", [True, False])
def test_session_media_is_resolved_with_the_recipients_permissions(
    monkeypatch: pytest.MonkeyPatch, user_id: int, visible: bool
) -> None:
    session = MagicMock()
    row = MagicMock()
    row.public_id = "session-id"
    row.host.public_id = "host-id"
    row.host.username = "host"
    row.host.image = None
    row.guest.public_id = "guest-id"
    row.guest.username = "guest"
    row.guest.image = None
    row.current_media.public_id = "station-id"
    row.current_time_ms = 1000
    row.is_playing = True
    row.date_updated = datetime.now(UTC)
    row.status.name = "ACTIVE"
    media = MediaResponse.model_validate(
        {
            "media": {
                "type": "station",
                "provider": "radioBrowser",
                "publicId": "station-id",
                "providerUrl": "https://example.com/station",
                "name": "Station",
                "imageUrl": "https://example.com/image",
            }
        }
    )
    resolve = AsyncMock(
        return_value=Result(ResultCode.OK, "OK", result=media)
        if visible
        else Result(ResultCode.NOT_FOUND, "not visible")
    )
    monkeypatch.setattr("core.framework.media.media.Media.get_media_async", resolve)

    result = asyncio.run(
        ListenTogether.build_sessions_response_async(session=session, user_id=user_id, rows=[row])
    )

    assert result.is_ok()
    snapshot = result.result().sessions[0]
    resolve.assert_awaited_once_with(session=session, public_id="station-id", user_id=user_id)
    assert snapshot.hostPublicId == "host-id"
    assert snapshot.guestPublicId == "guest-id"
    assert snapshot.currentMedia == (media if visible else None)
    assert snapshot.currentMediaName == ("Station" if visible else None)
    assert snapshot.updatedAt == row.date_updated
    assert snapshot.status == "active"
