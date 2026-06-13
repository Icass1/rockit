from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict

from fastapi import WebSocket
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.framework.user.user import User
from backend.core.framework.websocket.webSocketRouter import websocket_router
from backend.core.requests.wsMessages import QueueTypeRequest
from backend.core.responses.queueTypeMessage import QueueTypeMessage

if TYPE_CHECKING:
    from backend.core.framework.websocket.webSocketManager import WebSocketManager


@websocket_router.message("queue_type")
async def handle_queue_type(
    manager: "WebSocketManager",
    session: AsyncSession,
    user_id: int,
    data: Dict[str, Any],
    sender_websocket: WebSocket | None = None,
) -> None:
    queue_type_msg = QueueTypeRequest(**data)
    await User.update_queue_type_async(session, user_id, queue_type_msg.queueType)

    if sender_websocket is not None:
        relay_message = QueueTypeMessage(
            queueType=queue_type_msg.queueType,
        )
        await manager.send_to_user_async(
            user_id=user_id,
            message=relay_message,
            exclude_websocket=sender_websocket,
        )
