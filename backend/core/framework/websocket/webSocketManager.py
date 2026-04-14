import json
import time as time_module
from dataclasses import dataclass
from typing import Any, Dict, List, Set, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from fastapi import WebSocket

from backend.core.aResult import AResult, AResultCode
from backend.utils.logger import getLogger

from backend.core.access.db import rockit_db

from backend.core.framework.user.user import User
from backend.core.framework.media.media import Media
from backend.core.framework.models.media import MediaModel
from backend.core.framework.downloader.types import DownloadStatus
from backend.core.framework import providers

from backend.core.responses.downloadProgressMessage import DownloadProgressMessage
from backend.core.requests.wsMessages import (
    MediaEndedMessageRequest,
    CurrentMediaMessageRequest,
    CurrentQueueMessageRequest,
    CurrentTimeMessageRequest,
    MediaClickedMessageRequest,
    SkipClickedMessageRequest,
    SeekMessageRequest,
)

logger = getLogger(__name__)

LISTENED_THRESHOLD_PERCENT = 0.9


@dataclass
class UserPlaybackState:
    media_public_id: str = ""
    last_time_ms: int = 0
    last_timestamp: float = 0.0
    has_reached_listen_threshold: bool = False


class WebSocketManager:
    def __init__(self) -> None:
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        self.user_playback_states: Dict[int, UserPlaybackState] = {}

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        logger.info(f"WebSocket connected for user: {user_id}")

    def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
            logger.info(f"WebSocket disconnected for user: {user_id}")

    async def send_to_user(self, user_id: int, message: Any) -> None:
        if user_id not in self.active_connections:
            return

        if isinstance(message, dict):
            message_str: str = json.dumps(message)
        else:
            message_str: str = message.model_dump_json()

        disconnected: Set[WebSocket] = set()

        for websocket in self.active_connections[user_id]:
            try:
                await websocket.send_text(message_str)
            except Exception as e:
                logger.error(f"Error sending to websocket: {e}")
                disconnected.add(websocket)

        for ws in disconnected:
            self.disconnect(user_id, ws)

    async def broadcast_progress(
        self,
        user_id: int,
        download_id: int,
        public_id: str,
        title: str,
        artist: str,
        status: DownloadStatus,
        progress: float,
        message: str,
    ) -> None:
        download_message: DownloadProgressMessage = DownloadProgressMessage(
            type="download_progress",
            download_id=download_id,
            publicId=public_id,
            title=title,
            subTitle=artist,
            status=status,
            progress=progress,
            message=message,
        )
        await self.send_to_user(user_id=user_id, message=download_message)

    async def handle_client_message(self, user_id: int, data: Dict[str, Any]) -> None:
        message_type: str | None = data.get("type")
        logger.debug(f"Received WebSocket message from user {user_id}: {message_type}")

        if not message_type:
            logger.warning(
                f"Received WebSocket message without type from user {user_id}"
            )
            return

        async with rockit_db.session_scope_async() as session:
            if message_type == "media_ended":
                await self._handle_media_ended(user_id, data)
            elif message_type == "current_media":
                await self._handle_current_media(session, user_id, data)
            elif message_type == "current_queue":
                await self._handle_current_queue(session, user_id, data)
            elif message_type == "current_time":
                await self._handle_current_time(session, user_id, data)
            elif message_type == "media_clicked":
                await self._handle_media_clicked(session, user_id, data)
            elif message_type == "skip_clicked":
                await self._handle_skip_clicked(session, user_id, data)
            elif message_type == "seek":
                await self._handle_seek(session, user_id, data)
            else:
                logger.warning(f"Unknown message type: {message_type}")

    async def _handle_media_ended(self, user_id: int, data: Dict[str, Any]) -> None:
        media_ended_msg = MediaEndedMessageRequest(**data)
        logger.info(
            f"User {user_id} media ended. Media: {media_ended_msg.mediaPublicId}"
        )

    async def _handle_current_media(
        self, session: AsyncSession, user_id: int, data: Dict[str, Any]
    ) -> None:
        current_media_msg = CurrentMediaMessageRequest(**data)
        logger.info(
            f"User {user_id} current media: {current_media_msg.mediaPublicId}, "
            f"queue media id: {current_media_msg.queueMediaId}"
        )

        a_result_update_current_media: AResult[bool] = (
            await User.update_user_current_media(
                session=session,
                user_id=user_id,
                queue_media_id=current_media_msg.queueMediaId,
                media_public_id=current_media_msg.mediaPublicId,
            )
        )
        if a_result_update_current_media.is_not_ok():
            logger.error(
                f"Error updating current media. {a_result_update_current_media.info()}"
            )

    async def _handle_current_queue(
        self, session: AsyncSession, user_id: int, data: Dict[str, Any]
    ) -> None:
        current_queue_msg = CurrentQueueMessageRequest(**data)

        a_result_medias: AResult[List[MediaModel]] = (
            await Media.get_medias_from_public_ids_async(
                session=session,
                public_ids=[item.publicId for item in current_queue_msg.queue],
                media_type_keys=None,
            )
        )

        queue_items: List[Tuple[int, int]] = []

        for item in current_queue_msg.queue:
            item_id: int | None = next(
                (
                    row.id
                    for row in a_result_medias.result()
                    if row.public_id == item.publicId
                ),
                None,
            )

            if item_id is None:
                logger.error(
                    f"Item with public id {item.publicId} not found in media table"
                )
                continue

            queue_items.append((item.queueMediaId, item_id))

        await User.save_user_queue_async(
            session=session,
            user_id=user_id,
            queue_items=queue_items,
            queue_type=current_queue_msg.queueType,
        )

    async def _handle_current_time(
        self, session: AsyncSession, user_id: int, data: Dict[str, Any]
    ) -> None:
        current_time_msg = CurrentTimeMessageRequest(**data)
        current_time = current_time_msg.currentTimeMs
        media_public_id = current_time_msg.mediaPublicId

        playback_state = self.user_playback_states.setdefault(
            user_id, UserPlaybackState()
        )

        is_new_media = playback_state.media_public_id != media_public_id
        time_diff_ms = current_time - playback_state.last_time_ms

        logger.debug(
            f"[current_time] user={user_id} media={media_public_id} "
            f"current_time_ms={current_time} is_new_media={is_new_media} "
            f"time_diff_ms={time_diff_ms} already_reached_threshold={playback_state.has_reached_listen_threshold}"
        )

        await self._check_and_record_listen_threshold(
            user_id=user_id,
            media_public_id=media_public_id,
            current_time=current_time,
            is_new_media=is_new_media,
            time_diff_ms=time_diff_ms,
            playback_state=playback_state,
        )

        # Update state after the threshold check so is_new_media remains correct above
        if is_new_media:
            logger.debug(
                f"[current_time] user={user_id} switched to new media {media_public_id}, "
                f"resetting has_reached_listen_threshold"
            )
            playback_state.has_reached_listen_threshold = False

        playback_state.media_public_id = media_public_id
        playback_state.last_time_ms = current_time
        playback_state.last_timestamp = time_module.time()

        a_result_update_current_time: AResult[bool] = (
            await User.update_user_current_time(
                session=session,
                user_id=user_id,
                current_time_ms=current_time,
                media_public_id=media_public_id,
            )
        )
        if a_result_update_current_time.is_not_ok():
            logger.error(
                f"Error updating current time. {a_result_update_current_time.info()}"
            )

    async def _check_and_record_listen_threshold(
        self,
        user_id: int,
        media_public_id: str,
        current_time: int,
        is_new_media: bool,
        time_diff_ms: int,
        playback_state: UserPlaybackState,
    ) -> None:
        if playback_state.has_reached_listen_threshold:
            logger.debug(
                f"[threshold_check] user={user_id} media={media_public_id} — "
                f"already marked as listened, skipping check"
            )
            return

        if not media_public_id:
            logger.debug(
                f"[threshold_check] user={user_id} — no media_public_id, skipping check"
            )
            return

        logger.debug(
            f"[threshold_check] user={user_id} media={media_public_id} "
            f"(is_new_media={is_new_media}, time_diff_ms={time_diff_ms})"
        )

        async with rockit_db.session_scope_async() as duration_session:
            a_result_medias: AResult[List[MediaModel]] = (
                await Media.get_medias_from_public_ids_async(
                    session=duration_session,
                    public_ids=[media_public_id],
                    media_type_keys=None,
                )
            )

            if a_result_medias.is_not_ok() or not a_result_medias.result():
                logger.debug(
                    f"[threshold_check] user={user_id} media={media_public_id} — "
                    f"could not fetch media record, skipping"
                )
                return

            media_item: MediaModel = a_result_medias.result()[0]
            provider = providers.find_provider(media_item.provider_id)

            if not provider:
                logger.debug(
                    f"[threshold_check] user={user_id} media={media_public_id} — "
                    f"no provider found for provider_id={media_item.provider_id}, skipping"
                )
                return

            a_result_duration: AResult[int] = (
                await provider.get_media_duration_ms_async(
                    session=duration_session,
                    public_id=media_public_id,
                )
            )

            if a_result_duration.is_not_ok():
                logger.debug(
                    f"[threshold_check] user={user_id} media={media_public_id} — "
                    f"could not fetch duration, skipping"
                )
                return

            duration_ms: int = a_result_duration.result()

            if duration_ms <= 0:
                logger.debug(
                    f"[threshold_check] user={user_id} media={media_public_id} — "
                    f"invalid duration={duration_ms}, skipping"
                )
                return

            percent_listened = current_time / duration_ms
            threshold_ms = duration_ms * LISTENED_THRESHOLD_PERCENT

            logger.debug(
                f"[threshold_check] user={user_id} media={media_public_id} "
                f"current_time_ms={current_time} duration_ms={duration_ms} "
                f"percent_listened={percent_listened:.1%} threshold={LISTENED_THRESHOLD_PERCENT:.0%} "
                f"threshold_ms={threshold_ms:.0f} reached={current_time >= threshold_ms}"
            )

            if current_time < threshold_ms:
                return

            logger.info(
                f"User {user_id} listened to {percent_listened:.1%} of media {media_public_id} "
                f"(threshold: {LISTENED_THRESHOLD_PERCENT:.0%}) — recording listen"
            )
            playback_state.has_reached_listen_threshold = True

            a_result_listened: AResult[bool] = await User.add_user_media_listened_async(
                session=duration_session,
                user_id=user_id,
                media_id=media_item.id,
            )
            if a_result_listened.is_not_ok():
                logger.error(
                    f"Error adding user media listened for user {user_id}. {a_result_listened.info()}"
                )

    async def _handle_media_clicked(
        self, session: AsyncSession, user_id: int, data: Dict[str, Any]
    ) -> None:
        media_clicked_msg = MediaClickedMessageRequest(**data)
        logger.info(f"User {user_id} media clicked: {media_clicked_msg.mediaPublicId}")

        a_result_clicked: AResult[bool] = await User.add_user_media_clicked_async(
            session=session,
            user_id=user_id,
            media_public_id=media_clicked_msg.mediaPublicId,
        )
        if a_result_clicked.is_not_ok():
            logger.error(
                f"Error adding user media clicked for user {user_id}. {a_result_clicked.info()}"
            )

    async def _handle_skip_clicked(
        self, session: AsyncSession, user_id: int, data: Dict[str, Any]
    ) -> None:
        skip_clicked_msg = SkipClickedMessageRequest(**data)
        logger.info(
            f"User {user_id} skip clicked. Media: {skip_clicked_msg.mediaPublicId}. "
            f"Direction: {skip_clicked_msg.direction}"
        )

        a_result_skip: AResult[bool] = await User.add_user_skipped_media_async(
            session=session,
            user_id=user_id,
            media_public_id=skip_clicked_msg.mediaPublicId,
            direction=skip_clicked_msg.direction,
        )
        if a_result_skip.is_not_ok():
            logger.error(
                f"Error adding user media skip for user {user_id}. {a_result_skip.info()}"
            )

    async def _handle_seek(
        self, session: AsyncSession, user_id: int, data: Dict[str, Any]
    ) -> None:
        seek_msg = SeekMessageRequest(**data)

        a_result_media: AResult[MediaModel] = (
            await Media.get_media_from_public_id_async(
                session=session,
                public_id=seek_msg.mediaPublicId,
                media_type_keys=None,
            )
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


ws_manager = WebSocketManager()
