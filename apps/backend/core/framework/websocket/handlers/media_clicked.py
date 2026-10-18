from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict

from fastapi import WebSocket
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult
from backend.core.framework.user.user import User
from backend.core.framework.websocket.webSocketRouter import websocket_router
from backend.core.requests.wsMessages import MediaClickedMessageRequest

if TYPE_CHECKING:
    from backend.core.framework.websocket.webSocketManager import WebSocketManager

logger = getLogger(__name__)


@websocket_router.message("media_clicked")
async def handle_media_clicked(
    manager: "WebSocketManager",
    session: AsyncSession,
    user_id: int,
    data: Dict[str, Any],
    sender_websocket: WebSocket | None = None,
) -> None:
    media_clicked_msg = MediaClickedMessageRequest(**data)
    logger.info(f"User {user_id} media clicked: {media_clicked_msg.mediaPublicId}")

    a_result: AResult[bool] = await User.add_user_media_clicked_async(
        session=session,
        user_id=user_id,
        media_public_id=media_clicked_msg.mediaPublicId,
    )
    if a_result.is_not_ok():
        logger.error(
            f"Error adding user media clicked for user {user_id}. {a_result.info()}"
        )
