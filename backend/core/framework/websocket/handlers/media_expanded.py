from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict

from fastapi import WebSocket
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult
from backend.core.framework.websocket.webSocketRouter import websocket_router
from backend.core.requests.wsMessages import MediaExpandedMessageRequest
from backend.default.framework.playlist import Playlist

if TYPE_CHECKING:
    from backend.core.framework.websocket.webSocketManager import WebSocketManager

logger = getLogger(__name__)


@websocket_router.message("media_expanded")
async def handle_media_expanded(
    manager: "WebSocketManager",
    session: AsyncSession,
    user_id: int,
    data: Dict[str, Any],
    sender_websocket: WebSocket | None = None,
) -> None:
    expanded_msg = MediaExpandedMessageRequest(**data)
    logger.info(
        f"User {user_id} media expanded: {expanded_msg.mediaPublicId} "
        f"in playlist {expanded_msg.playlistPublicId}: {expanded_msg.expanded}"
    )

    a_result: AResult[bool] = await Playlist.set_media_expanded_async(
        session=session,
        user_id=user_id,
        playlist_public_id=expanded_msg.playlistPublicId,
        media_public_id=expanded_msg.mediaPublicId,
        is_expanded=expanded_msg.expanded,
    )
    if a_result.is_not_ok():
        logger.error(f"Error setting expanded state. {a_result.info()}")
