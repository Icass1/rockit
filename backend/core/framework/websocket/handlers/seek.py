from __future__ import annotations

import time as time_module
from typing import TYPE_CHECKING, Any, Dict

from fastapi import WebSocket
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.framework.media.media import Media
from backend.core.framework.models.media import MediaModel
from backend.core.framework.user.user import User
from backend.core.framework.websocket.listenInterval import close_listen_interval_async
from backend.core.framework.websocket.webSocketRouter import websocket_router
from backend.core.requests.wsMessages import SeekMessageRequest

if TYPE_CHECKING:
    from backend.core.framework.websocket.webSocketManager import WebSocketManager

logger = getLogger(__name__)


@websocket_router.message("seek")
async def handle_seek(
    manager: "WebSocketManager",
    session: AsyncSession,
    user_id: int,
    data: Dict[str, Any],
    sender_websocket: WebSocket | None = None,
) -> None:
    seek_msg = SeekMessageRequest(**data)

    a_result_media: AResult[MediaModel] = await Media.get_media_from_public_id_async(
        session=session,
        public_id=seek_msg.mediaPublicId,
        media_type_keys=None,
    )
    if a_result_media.is_not_ok():
        logger.error(
            f"Error getting media for public id {seek_msg.mediaPublicId}. {a_result_media.info()}"
        )
        return

    a_result: AResultCode = await User.add_user_current_time_seek_async(
        session=session,
        user_id=user_id,
        media_id=a_result_media.result().id,
        time_from=seek_msg.timeFrom,
        time_to=seek_msg.timeTo,
    )
    if a_result.is_not_ok():
        logger.error(
            f"Error adding user current time seek for user {user_id}. {a_result.info()}"
        )

    playback_state = manager.user_playback_states.get(user_id)

    if playback_state and playback_state.active_interval_start_ms is not None:
        seek_time_ms_from: int = int(seek_msg.timeFrom * 1000)
        await close_listen_interval_async(
            session=session,
            user_id=user_id,
            playback_state=playback_state,
            time_ms_end=seek_time_ms_from,
        )

    if playback_state:
        seek_time_ms_to: int = int(seek_msg.timeTo * 1000)
        playback_state.active_interval_start_ms = seek_time_ms_to
        playback_state.active_interval_media_id = a_result_media.result().id
        playback_state.active_interval_db_id = None
        playback_state.active_interval_start_timestamp = time_module.time()
        playback_state.active_interval_last_flush_timestamp = None
