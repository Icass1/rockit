import json
import time as time_module
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Set
from sqlalchemy.ext.asyncio import AsyncSession

from fastapi import WebSocket

from backend.core.aResult import AResult, AResultCode
from backend.utils.logger import getLogger

from backend.core.access.db import rockit_db

from backend.core.framework import providers
from backend.core.framework.user.user import User
from backend.core.access.db.ormModels.user_media_listen_interval import (
    UserMediaListenIntervalRow,
)
from backend.core.framework.media.media import Media
from backend.core.framework.models.media import MediaModel
from backend.core.enums.downloadStatusEnum import DownloadStatusEnum
from backend.core.framework.websocket.sendToUser import SendToUser
from backend.core.framework.models.queue import QueueItem

from backend.core.responses.downloadProgressMessage import DownloadProgressMessage
from backend.core.responses.mediaListenedMessage import MediaListenedMessage
from backend.core.requests.wsMessages import (
    MediaEndedMessageRequest,
    CurrentMediaMessageRequest,
    CurrentQueueMessageRequest,
    CurrentTimeMessageRequest,
    QueueTypeRequest,
    MediaClickedMessageRequest,
    SkipClickedMessageRequest,
    SeekMessageRequest,
    MediaExpandedMessageRequest,
)

logger = getLogger(__name__)

LISTENED_THRESHOLD_PERCENT = 0.9
FLUSH_INTERVAL_SECONDS = 30


@dataclass
class UserPlaybackState:
    media_public_id: str = ""
    last_time_ms: int = 0
    last_timestamp: float = 0.0
    has_reached_listen_threshold: bool = False
    active_interval_start_ms: int | None = None
    active_interval_media_id: int | None = None
    active_interval_db_id: int | None = None
    active_interval_start_timestamp: float | None = None
    active_interval_last_flush_timestamp: float | None = None


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

    async def disconnect_async(self, user_id: int, websocket: WebSocket) -> None:
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                await self._close_listen_interval_on_disconnect_async(user_id)
            logger.info(f"WebSocket disconnected for user: {user_id}")

    async def send_to_user_async(self, user_id: int, message: Any) -> None:
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
            await self.disconnect_async(user_id, ws)

    async def broadcast_progress_async(
        self,
        user_id: int,
        download_public_id: str,
        media_public_id: str,
        title: str,
        subTitle: str,
        status: DownloadStatusEnum,
        progress: float,
        date_started: datetime,
        date_ended: datetime | None,
    ) -> None:
        download_message: DownloadProgressMessage = DownloadProgressMessage(
            publicId=download_public_id,
            mediaPublicId=media_public_id,
            name=title,
            subtitle=subTitle,
            status=status,
            progress=progress,
            dateStarted=date_started,
            dateEnded=date_ended,
        )
        await self.send_to_user_async(user_id=user_id, message=download_message)

    async def handle_client_message_async(
        self, user_id: int, data: Dict[str, Any]
    ) -> None:
        message_type: str | None = data.get("type")
        logger.debug(f"Received WebSocket message from user {user_id}: {message_type}")

        if not message_type:
            logger.warning(
                f"Received WebSocket message without type from user {user_id}"
            )
            return

        async with rockit_db.session_scope_async() as session:
            if message_type == "media_ended":
                await self._handle_media_ended_async(session, user_id, data)
            elif message_type == "current_media":
                await self._handle_current_media_async(session, user_id, data)
            elif message_type == "current_queue":
                await self._handle_current_queue_async(session, user_id, data)
            elif message_type == "current_time":
                await self._handle_current_time_async(session, user_id, data)
            elif message_type == "media_clicked":
                await self._handle_media_clicked_async(session, user_id, data)
            elif message_type == "skip_clicked":
                await self._handle_skip_clicked(session, user_id, data)
            elif message_type == "seek":
                await self._handle_seek_async(session, user_id, data)
            elif message_type == "queue_type":
                await self._handle_queue_type_async(session, user_id, data)
            elif message_type == "media_expanded":
                await self._handle_media_expanded_async(session, user_id, data)
            else:
                logger.warning(f"Unknown message type: {message_type}")

    async def _handle_media_ended_async(
        self, session: AsyncSession, user_id: int, data: Dict[str, Any]
    ) -> None:
        media_ended_msg = MediaEndedMessageRequest(**data)
        logger.info(
            f"User {user_id} media ended. Media: {media_ended_msg.mediaPublicId}"
        )

        playback_state = self.user_playback_states.get(user_id)
        if playback_state and playback_state.active_interval_start_ms is not None:
            await self._close_listen_interval_async(
                session=session,
                user_id=user_id,
                playback_state=playback_state,
                time_ms_end=playback_state.last_time_ms,
            )

    async def _handle_current_media_async(
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
                queue_id=current_media_msg.queueMediaId,
                media_public_id=current_media_msg.mediaPublicId,
            )
        )
        if a_result_update_current_media.is_not_ok():
            logger.error(
                f"Error updating current media. {a_result_update_current_media.info()}"
            )

    async def _handle_current_queue_async(
        self, session: AsyncSession, user_id: int, data: Dict[str, Any]
    ) -> None:
        current_queue_msg = CurrentQueueMessageRequest(**data)

        a_result_medias: AResult[List[MediaModel]] = (
            await Media.get_medias_from_public_ids_async(
                session=session,
                public_ids=[item.mediaPublicId for item in current_queue_msg.queue]
                + [
                    item.listPublicId
                    for item in current_queue_msg.queue
                    if item.listPublicId
                ],
                media_type_keys=None,
            )
        )

        queue_items: List[QueueItem] = []

        for item in current_queue_msg.queue:
            item_id: int | None = next(
                (
                    row.id
                    for row in a_result_medias.result()
                    if row.public_id == item.mediaPublicId
                ),
                None,
            )

            list_id: int | None = next(
                (
                    row.id
                    for row in a_result_medias.result()
                    if row.public_id == item.listPublicId
                ),
                None,
            )

            if item_id is None:
                logger.error(
                    f"Item with public id {item.mediaPublicId} not found in media table"
                )
                continue

            queue_items.append(
                QueueItem(
                    media_id=item_id,
                    queue_id=item.queueMediaId,
                    list_id=list_id,
                    sorted_index=item.sortedIndex,
                    random_index=item.randomIndex,
                )
            )

        await User.save_user_queue_async(
            session=session,
            user_id=user_id,
            queue_items=queue_items,
        )

    async def _handle_current_time_async(
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

        if is_new_media:
            # Close previous listen interval if one is active
            if playback_state.active_interval_start_ms is not None:
                await self._close_listen_interval_async(
                    session=session,
                    user_id=user_id,
                    playback_state=playback_state,
                    time_ms_end=playback_state.last_time_ms,
                )

            # Start a new listen interval for the new media
            await self._start_listen_interval_async(
                session=session,
                user_id=user_id,
                media_public_id=media_public_id,
                time_ms_start=current_time,
                playback_state=playback_state,
            )

        await self._check_and_record_listen_threshold_async(
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

        await self._maybe_flush_listen_interval_async(
            session=session,
            user_id=user_id,
            playback_state=playback_state,
            current_time_ms=current_time,
        )

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

    async def _check_and_record_listen_threshold_async(
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
            provider = providers.find_media_provider(media_item.provider_id)

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
            else:
                await SendToUser.send_to_user(
                    user_id=user_id,
                    message=MediaListenedMessage(publicId=media_public_id),
                )

    async def _close_listen_interval_async(
        self,
        session: AsyncSession,
        user_id: int,
        playback_state: UserPlaybackState,
        time_ms_end: int,
    ) -> None:
        """Close the current listen interval by recording it to the DB."""

        if (
            playback_state.active_interval_start_ms is None
            or playback_state.active_interval_media_id is None
        ):
            return

        if time_ms_end <= playback_state.active_interval_start_ms:
            logger.debug(
                f"Skipping zero/negative-duration interval media={playback_state.active_interval_media_id} "
                f"start={playback_state.active_interval_start_ms}ms end={time_ms_end}ms"
            )
            playback_state.active_interval_start_ms = None
            playback_state.active_interval_media_id = None
            return

        if playback_state.active_interval_db_id is not None:
            a_result_update: AResultCode = (
                await User.update_media_listen_interval_end_async(
                    session=session,
                    interval_id=playback_state.active_interval_db_id,
                    time_ms_end=time_ms_end,
                )
            )
            if a_result_update.is_not_ok():
                logger.error(
                    f"Error finalising listen interval. {a_result_update.info()}"
                )
            else:
                logger.debug(
                    f"Finalised listen interval db_id={playback_state.active_interval_db_id} "
                    f"end={time_ms_end}ms"
                )
        else:
            a_result_insert_close: AResult[UserMediaListenIntervalRow] = (
                await User.record_media_listen_interval_async(
                    session=session,
                    user_id=user_id,
                    media_id=playback_state.active_interval_media_id,
                    time_ms_start=playback_state.active_interval_start_ms,
                    time_ms_end=time_ms_end,
                )
            )
            if a_result_insert_close.is_not_ok():
                logger.error(
                    f"Error recording listen interval. {a_result_insert_close.info()}"
                )
            else:
                logger.debug(
                    f"Recorded listen interval media={playback_state.active_interval_media_id} "
                    f"start={playback_state.active_interval_start_ms}ms end={time_ms_end}ms"
                )

        playback_state.active_interval_start_ms = None
        playback_state.active_interval_media_id = None
        playback_state.active_interval_db_id = None
        playback_state.active_interval_start_timestamp = None
        playback_state.active_interval_last_flush_timestamp = None

    async def _start_listen_interval_async(
        self,
        session: AsyncSession,
        user_id: int,
        media_public_id: str,
        time_ms_start: int,
        playback_state: UserPlaybackState,
    ) -> None:
        """Start tracking a new listen interval in state (no DB write yet)."""

        a_result_media: AResult[MediaModel] = (
            await Media.get_media_from_public_id_async(
                session=session,
                public_id=media_public_id,
                media_type_keys=None,
            )
        )
        if a_result_media.is_not_ok():
            logger.error(
                f"Error getting media for interval start. {a_result_media.info()}"
            )
            return

        playback_state.active_interval_start_ms = time_ms_start
        playback_state.active_interval_media_id = a_result_media.result().id
        playback_state.active_interval_db_id = None
        playback_state.active_interval_start_timestamp = time_module.time()
        playback_state.active_interval_last_flush_timestamp = None
        logger.debug(
            f"Tracking listen interval for media {media_public_id} from {time_ms_start}ms"
        )

    async def _close_listen_interval_on_disconnect_async(
        self,
        user_id: int,
    ) -> None:
        """Close the active listen interval when a user fully disconnects."""

        playback_state = self.user_playback_states.get(user_id)
        if playback_state and playback_state.active_interval_start_ms is not None:
            async with rockit_db.session_scope_async() as session:
                await self._close_listen_interval_async(
                    session=session,
                    user_id=user_id,
                    playback_state=playback_state,
                    time_ms_end=playback_state.last_time_ms,
                )

    async def _handle_media_clicked_async(
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

    async def _handle_queue_type_async(
        self, session: AsyncSession, user_id: int, data: Dict[str, Any]
    ) -> None:
        queue_type_msg = QueueTypeRequest(**data)

        await User.update_queue_type_async(session, user_id, queue_type_msg.queueType)

    async def _handle_seek_async(
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

        playback_state = self.user_playback_states.get(user_id)

        # Close the current interval at the position before seek
        if playback_state and playback_state.active_interval_start_ms is not None:
            seek_time_ms_from: int = int(seek_msg.timeFrom * 1000)
            await self._close_listen_interval_async(
                session=session,
                user_id=user_id,
                playback_state=playback_state,
                time_ms_end=seek_time_ms_from,
            )

        # Start a new interval from the position after seek
        if playback_state:
            seek_time_ms_to: int = int(seek_msg.timeTo * 1000)
            playback_state.active_interval_start_ms = seek_time_ms_to
            playback_state.active_interval_media_id = a_result_media.result().id
            playback_state.active_interval_db_id = None
            playback_state.active_interval_start_timestamp = time_module.time()
            playback_state.active_interval_last_flush_timestamp = None

    async def _maybe_flush_listen_interval_async(
        self,
        session: AsyncSession,
        user_id: int,
        playback_state: UserPlaybackState,
        current_time_ms: int,
    ) -> None:
        """Insert or update the open interval in the DB every 5 minutes."""

        if (
            playback_state.active_interval_start_ms is None
            or playback_state.active_interval_media_id is None
            or playback_state.active_interval_start_timestamp is None
        ):
            return

        now = time_module.time()

        if playback_state.active_interval_db_id is None:
            elapsed = now - playback_state.active_interval_start_timestamp
            logger.debug(f"Elapsed: {elapsed}")
            if elapsed < FLUSH_INTERVAL_SECONDS:
                return

            a_result_insert: AResult[UserMediaListenIntervalRow] = (
                await User.record_media_listen_interval_async(
                    session=session,
                    user_id=user_id,
                    media_id=playback_state.active_interval_media_id,
                    time_ms_start=playback_state.active_interval_start_ms,
                    time_ms_end=current_time_ms,
                )
            )
            if a_result_insert.is_not_ok():
                logger.error(
                    f"Error flushing listen interval. {a_result_insert.info()}"
                )
                return

            row_id: int = a_result_insert.result().id
            playback_state.active_interval_db_id = row_id
            playback_state.active_interval_last_flush_timestamp = now
            logger.debug(
                f"Flushed open interval to DB for user={user_id} "
                f"db_id={playback_state.active_interval_db_id} end={current_time_ms}ms"
            )
        else:
            if (
                playback_state.active_interval_last_flush_timestamp is None
                or now - playback_state.active_interval_last_flush_timestamp
                < FLUSH_INTERVAL_SECONDS
            ):
                return

            a_result_update: AResultCode = (
                await User.update_media_listen_interval_end_async(
                    session=session,
                    interval_id=playback_state.active_interval_db_id,
                    time_ms_end=current_time_ms,
                )
            )
            if a_result_update.is_not_ok():
                logger.error(
                    f"Error updating open interval end. {a_result_update.info()}"
                )
                return

            playback_state.active_interval_last_flush_timestamp = now
            logger.debug(
                f"Updated open interval end for user={user_id} "
                f"db_id={playback_state.active_interval_db_id} end={current_time_ms}ms"
            )

    async def _handle_media_expanded_async(
        self, session: AsyncSession, user_id: int, data: Dict[str, Any]
    ) -> None:
        expanded_msg = MediaExpandedMessageRequest(**data)
        logger.info(
            f"User {user_id} media expanded: {expanded_msg.mediaPublicId} "
            f"in playlist {expanded_msg.playlistPublicId}: {expanded_msg.expanded}"
        )

        from backend.default.framework.playlist import Playlist

        a_result: AResult[bool] = await Playlist.set_media_expanded_async(
            session=session,
            user_id=user_id,
            playlist_public_id=expanded_msg.playlistPublicId,
            media_public_id=expanded_msg.mediaPublicId,
            is_expanded=expanded_msg.expanded,
        )
        if a_result.is_not_ok():
            logger.error(f"Error setting expanded state. {a_result.info()}")


ws_manager = WebSocketManager()
