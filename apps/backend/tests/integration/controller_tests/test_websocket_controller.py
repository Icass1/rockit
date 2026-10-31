"""WebSocket controller handshake contracts using an isolated FastAPI app."""

from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI, WebSocket
from fastapi.testclient import TestClient

from core.controllers import wsController
from core.framework.websocket.webSocketManager import ws_manager


def test_authenticated_connection_receives_social_and_notification_snapshots(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app = FastAPI()
    app.include_router(wsController.router)
    authenticate = AsyncMock(return_value=42)
    monkeypatch.setattr(wsController, "get_user_id_from_websocket", authenticate)
    accepted_sockets: list[WebSocket] = []

    async def accept_connection(user_id: int, websocket: WebSocket) -> None:
        assert user_id == 42
        accepted_sockets.append(websocket)
        await websocket.accept()

    connect = AsyncMock(side_effect=accept_connection)
    monkeypatch.setattr(ws_manager, "connect", connect)

    async def send_social_snapshot_async(user_id: int, websocket: WebSocket) -> None:
        assert user_id == 42
        await websocket.send_json(
            {
                "type": "social_changed",
                "friends": [],
                "incoming": [],
                "sent": [],
                "activities": [],
            }
        )

    async def send_notification_state_async(user_id: int, websocket: WebSocket) -> None:
        assert user_id == 42
        await websocket.send_json({"type": "notification_state", "unreadCount": 3, "totalCount": 9})

    send_social = AsyncMock(side_effect=send_social_snapshot_async)
    send_notifications = AsyncMock(side_effect=send_notification_state_async)
    disconnect = AsyncMock()
    monkeypatch.setattr(ws_manager, "send_social_snapshot_async", send_social)
    monkeypatch.setattr(ws_manager, "send_notification_state_async", send_notifications)
    monkeypatch.setattr(ws_manager, "disconnect_async", disconnect)

    test_client = TestClient(app)
    with test_client.websocket_connect("/ws") as websocket:
        assert websocket.receive_json() == {
            "type": "social_changed",
            "friends": [],
            "incoming": [],
            "sent": [],
            "activities": [],
        }
        assert websocket.receive_json() == {
            "type": "notification_state",
            "unreadCount": 3,
            "totalCount": 9,
        }

    authenticate.assert_awaited_once()
    connect.assert_awaited_once()
    send_social.assert_awaited_once()
    send_notifications.assert_awaited_once()
    disconnect.assert_awaited_once()
    assert disconnect.await_args is not None
    assert disconnect.await_args.args == (42, accepted_sockets[0])
