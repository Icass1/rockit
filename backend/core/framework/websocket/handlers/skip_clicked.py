from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult
from backend.core.framework.user.user import User
from backend.core.framework.websocket.webSocketRouter import websocket_router
from backend.core.requests.wsMessages import SkipClickedMessageRequest

if TYPE_CHECKING:
    from backend.core.framework.websocket.webSocketManager import WebSocketManager

logger = getLogger(__name__)


@websocket_router.message("skip_clicked")
async def handle_skip_clicked(
    manager: "WebSocketManager",
    session: AsyncSession,
    user_id: int,
    data: Dict[str, Any],
) -> None:
    skip_clicked_msg = SkipClickedMessageRequest(**data)
    logger.info(
        f"User {user_id} skip clicked. Media: {skip_clicked_msg.mediaPublicId}. "
        f"Direction: {skip_clicked_msg.direction}"
    )

    a_result: AResult[bool] = await User.add_user_skipped_media_async(
        session=session,
        user_id=user_id,
        media_public_id=skip_clicked_msg.mediaPublicId,
        direction=skip_clicked_msg.direction,
    )
    if a_result.is_not_ok():
        logger.error(
            f"Error adding user media skip for user {user_id}. {a_result.info()}"
        )
