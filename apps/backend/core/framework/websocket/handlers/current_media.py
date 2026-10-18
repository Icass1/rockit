from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict

from fastapi import WebSocket
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult
from backend.core.framework.user.user import User
from backend.core.framework.websocket.playbackState import UserPlaybackState
from backend.core.framework.websocket.listenInterval import close_listen_interval_async
from backend.core.framework.websocket.webSocketRouter import websocket_router
from backend.core.requests.wsMessages import CurrentMediaMessageRequest
from backend.core.responses.currentMediaMessage import CurrentMediaMessage

if TYPE_CHECKING:
    from backend.core.framework.websocket.webSocketManager import WebSocketManager

logger = getLogger(__name__)


@websocket_router.message("current_media")
async def handle_current_media(
    manager: "WebSocketManager",
    session: AsyncSession,
    user_id: int,
    data: Dict[str, Any],
    sender_websocket: WebSocket | None = None,
) -> None:
    current_media_msg = CurrentMediaMessageRequest(**data)
    logger.info(
        f"User {user_id} current media: {current_media_msg.mediaPublicId}, "
        f"queue media id: {current_media_msg.queueMediaId}"
    )

    if manager.matches_playback(user_id=user_id, message=current_media_msg):
        if sender_websocket is not None:
            is_owner = manager.playback_owners.get(user_id) is sender_websocket
            if user_id not in manager.playback_owners:
                manager.playback_owners[user_id] = sender_websocket
                is_owner = True
            await manager.send_to_socket_async(
                websocket=sender_websocket,
                message=CurrentMediaMessage(
                    **current_media_msg.model_dump(), isPlaybackOwner=is_owner
                ),
            )
        return

    a_result: AResult[bool] = await User.update_user_current_media(
        session=session,
        user_id=user_id,
        queue_id=current_media_msg.queueMediaId,
        media_public_id=current_media_msg.mediaPublicId,
    )
    if a_result.is_not_ok():
        logger.error(f"Error updating current media. {a_result.info()}")
        return

    previous_state = manager.user_playback_states.get(user_id)
    if previous_state:
        await close_listen_interval_async(
            session=session,
            user_id=user_id,
            playback_state=previous_state,
            time_ms_end=previous_state.last_time_ms,
        )
    manager.user_playback_states[user_id] = UserPlaybackState(
        playback_id=current_media_msg.playbackId,
        queue_media_id=current_media_msg.queueMediaId,
        queue_type=current_media_msg.queueType.name,
        media_public_id=current_media_msg.mediaPublicId,
        last_time_ms=current_media_msg.currentTimeMs,
    )
    if sender_websocket is not None:
        manager.playback_owners[user_id] = sender_websocket
    time_result = await User.update_user_current_time(
        session=session,
        user_id=user_id,
        current_time_ms=current_media_msg.currentTimeMs,
        media_public_id=current_media_msg.mediaPublicId,
    )
    if time_result.is_not_ok():
        logger.error(f"Error resetting current time. {time_result.info()}")
        return

    if sender_websocket is not None:
        relay_message = CurrentMediaMessage(
            playbackId=current_media_msg.playbackId,
            currentTimeMs=current_media_msg.currentTimeMs,
            mediaPublicId=current_media_msg.mediaPublicId,
            queueMediaId=current_media_msg.queueMediaId,
            queueType=current_media_msg.queueType,
        )
        await manager.send_to_user_async(
            user_id=user_id,
            message=relay_message,
            exclude_websocket=sender_websocket,
        )
        # Grant only after revoking playback on the other connected devices.
        await manager.send_to_socket_async(
            websocket=sender_websocket,
            message=relay_message.model_copy(update={"isPlaybackOwner": True}),
        )
