from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict

from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.framework.user.user import User
from backend.core.framework.websocket.webSocketRouter import websocket_router
from backend.core.requests.wsMessages import QueueTypeRequest

if TYPE_CHECKING:
    from backend.core.framework.websocket.webSocketManager import WebSocketManager


@websocket_router.message("queue_type")
async def handle_queue_type(
    manager: "WebSocketManager",
    session: AsyncSession,
    user_id: int,
    data: Dict[str, Any],
) -> None:
    queue_type_msg = QueueTypeRequest(**data)
    await User.update_queue_type_async(session, user_id, queue_type_msg.queueType)
