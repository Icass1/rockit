from __future__ import annotations

from typing import TYPE_CHECKING, Any

from fastapi import WebSocket
from sqlalchemy.ext.asyncio import AsyncSession

from core.framework.user.user import User
from core.framework.websocket.webSocketRouter import websocket_router
from core.requests.wsMessages import QueueTypeRequest
from core.responses.queueTypeMessage import QueueTypeMessage

if TYPE_CHECKING:
    from core.framework.websocket.webSocketManager import WebSocketManager


@websocket_router.message("queue_type")
async def handle_queue_type(
    manager: WebSocketManager,
    session: AsyncSession,
    user_id: int,
    data: dict[str, Any],
    sender_websocket: WebSocket | None = None,
) -> None:
    queue_type_msg = QueueTypeRequest(**data)
    await User.update_queue_type_async(session, user_id, queue_type_msg.queueType)

    state = manager.user_playback_states.get(user_id)
    if state is not None:
        state.queue_type = queue_type_msg.queueType.name

    if sender_websocket is not None:
        relay_message = QueueTypeMessage(
            queueType=queue_type_msg.queueType,
        )
        await manager.send_to_user_async(
            user_id=user_id,
            message=relay_message,
            exclude_websocket=sender_websocket,
        )
