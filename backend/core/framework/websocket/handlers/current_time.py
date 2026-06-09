from __future__ import annotations

import time as time_module
from typing import TYPE_CHECKING, Any, Dict

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult
from backend.core.framework.user.user import User
from backend.core.framework.websocket.listenInterval import (
    check_and_record_listen_threshold_async,
    close_listen_interval_async,
    maybe_flush_listen_interval_async,
    start_listen_interval_async,
)
from backend.core.framework.websocket.playbackState import UserPlaybackState
from backend.core.framework.websocket.webSocketRouter import websocket_router
from backend.core.requests.wsMessages import CurrentTimeMessageRequest

if TYPE_CHECKING:
    from backend.core.framework.websocket.webSocketManager import WebSocketManager

logger = getLogger(__name__)


@websocket_router.message("current_time")
async def handle_current_time(
    manager: "WebSocketManager",
    session: AsyncSession,
    user_id: int,
    data: Dict[str, Any],
) -> None:
    current_time_msg = CurrentTimeMessageRequest(**data)
    current_time = current_time_msg.currentTimeMs
    media_public_id = current_time_msg.mediaPublicId

    playback_state = manager.user_playback_states.setdefault(
        user_id, UserPlaybackState()
    )

    is_new_media = playback_state.media_public_id != media_public_id
    time_diff_ms = current_time - playback_state.last_time_ms

    # logger.debug(
    #     f"[current_time] user={user_id} media={media_public_id} "
    #     f"current_time_ms={current_time} is_new_media={is_new_media} "
    #     f"time_diff_ms={time_diff_ms} already_reached_threshold={playback_state.has_reached_listen_threshold}"
    # )

    if is_new_media:
        if playback_state.active_interval_start_ms is not None:
            await close_listen_interval_async(
                session=session,
                user_id=user_id,
                playback_state=playback_state,
                time_ms_end=playback_state.last_time_ms,
            )

        await start_listen_interval_async(
            session=session,
            user_id=user_id,
            media_public_id=media_public_id,
            time_ms_start=current_time,
            playback_state=playback_state,
        )
    elif playback_state.active_interval_start_ms is None and media_public_id:
        await start_listen_interval_async(
            session=session,
            user_id=user_id,
            media_public_id=media_public_id,
            time_ms_start=current_time,
            playback_state=playback_state,
        )

    await check_and_record_listen_threshold_async(
        user_id=user_id,
        media_public_id=media_public_id,
        current_time=current_time,
        is_new_media=is_new_media,
        time_diff_ms=time_diff_ms,
        playback_state=playback_state,
    )

    if is_new_media:
        logger.debug(
            f"[current_time] user={user_id} switched to new media {media_public_id}, "
            f"resetting has_reached_listen_threshold"
        )
        playback_state.has_reached_listen_threshold = False

    playback_state.media_public_id = media_public_id
    playback_state.last_time_ms = current_time
    playback_state.last_timestamp = time_module.time()

    await maybe_flush_listen_interval_async(
        session=session,
        user_id=user_id,
        playback_state=playback_state,
        current_time_ms=current_time,
    )

    a_result: AResult[bool] = await User.update_user_current_time(
        session=session,
        user_id=user_id,
        current_time_ms=current_time,
        media_public_id=media_public_id,
    )
    if a_result.is_not_ok():
        logger.error(f"Error updating current time. {a_result.info()}")
