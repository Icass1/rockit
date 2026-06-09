from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult
from backend.core.framework.user.user import User
from backend.core.framework.websocket.webSocketRouter import websocket_router
from backend.core.requests.wsMessages import CurrentMediaMessageRequest

if TYPE_CHECKING:
    from backend.core.framework.websocket.webSocketManager import WebSocketManager

logger = getLogger(__name__)


@websocket_router.message("current_media")
async def handle_current_media(
    manager: "WebSocketManager",
    session: AsyncSession,
    user_id: int,
    data: Dict[str, Any],
) -> None:
    current_media_msg = CurrentMediaMessageRequest(**data)
    logger.info(
        f"User {user_id} current media: {current_media_msg.mediaPublicId}, "
        f"queue media id: {current_media_msg.queueMediaId}"
    )

    a_result: AResult[bool] = await User.update_user_current_media(
        session=session,
        user_id=user_id,
        queue_id=current_media_msg.queueMediaId,
        media_public_id=current_media_msg.mediaPublicId,
    )
    if a_result.is_not_ok():
        logger.error(f"Error updating current media. {a_result.info()}")
