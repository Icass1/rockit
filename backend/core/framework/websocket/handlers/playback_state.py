from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict
from fastapi import WebSocket
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.framework.websocket.webSocketRouter import websocket_router
from backend.core.responses.currentMediaMessage import CurrentMediaMessage

if TYPE_CHECKING:
    from backend.core.framework.websocket.webSocketManager import WebSocketManager

logger = getLogger(__name__)


@websocket_router.message("playback_state")
async def handle_playback_state(
    manager: "WebSocketManager",
    session: AsyncSession,
    user_id: int,
    data: Dict[str, Any],
    sender_websocket: WebSocket | None = None,
) -> None:
    """Send the current playback occurrence to a newly connected device."""
    state = manager.user_playback_states.get(user_id)
    if state is None or sender_websocket is None or state.queue_media_id is None:
        return
    message = CurrentMediaMessage(
        isPlaybackOwner=manager.playback_owners.get(user_id) is sender_websocket,
        mediaPublicId=state.media_public_id,
        queueMediaId=state.queue_media_id,
        playbackId=state.playback_id,
        currentTimeMs=state.last_time_ms,
        queueType=state.queue_type,
    )
    try:
        await sender_websocket.send_text(message.model_dump_json())
    except Exception as error:
        logger.error(f"Error sending playback snapshot: {error}")
