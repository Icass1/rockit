from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.framework.websocket.listenInterval import close_listen_interval_async
from backend.core.framework.websocket.webSocketRouter import websocket_router
from backend.core.requests.wsMessages import MediaEndedMessageRequest

if TYPE_CHECKING:
    from backend.core.framework.websocket.webSocketManager import WebSocketManager

logger = getLogger(__name__)


@websocket_router.message("media_ended")
async def handle_media_ended(
    manager: "WebSocketManager",
    session: AsyncSession,
    user_id: int,
    data: Dict[str, Any],
) -> None:
    media_ended_msg = MediaEndedMessageRequest(**data)
    logger.info(
        f"User {user_id} media ended. Media: {media_ended_msg.mediaPublicId}"
    )

    playback_state = manager.user_playback_states.get(user_id)
    if playback_state and playback_state.active_interval_start_ms is not None:
        await close_listen_interval_async(
            session=session,
            user_id=user_id,
            playback_state=playback_state,
            time_ms_end=playback_state.last_time_ms,
        )
