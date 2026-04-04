import json
from typing import Any, Dict, List, Set, Tuple

from fastapi import WebSocket

from backend.core.aResult import AResult, AResultCode
from backend.utils.logger import getLogger

from backend.core.access.db import rockit_db

from backend.core.framework.media.media import Media
from backend.core.framework.models.media import MediaModel
from backend.core.framework.user.user import User

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


class WebSocketManager:
    def __init__(self) -> None:
        self.active_connections: Dict[int, Set[WebSocket]] = {}

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
        status: str,
        progress: float,
        message: str,
    ) -> None:
        download_message: DownloadProgressMessage = DownloadProgressMessage(
            download_id=download_id,
            publicId=public_id,
            title=title,
            artist=artist,
            status=status,
            progress=progress,
            message=message,
        )
        await self.send_to_user(user_id=user_id, message=download_message)

    async def handle_client_message(self, user_id: int, data: dict[str, Any]) -> None:
        message_type = data.get("type")
        # logger.info(f"Received WebSocket message from user {user_id}: {message_type}")

        async with rockit_db.session_scope_async() as session:
            if message_type == "media_ended":
                media_ended_msg = MediaEndedMessageRequest(**data)
                logger.info(
                    f"User {user_id} media ended. Media: {media_ended_msg.mediaPublicId}"
                )
            elif message_type == "current_media":
                current_media_msg = CurrentMediaMessageRequest(**data)
                logger.info(
                    f"User {user_id} current media: {current_media_msg.mediaPublicId}, queue media id: {current_media_msg.queueMediaId}"
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

            elif message_type == "current_queue":
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

                    item_id: int | None = None

                    for row in a_result_medias.result():
                        if row.public_id == item.publicId:
                            item_id = row.id

                    if item_id == None:
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
            elif message_type == "current_time":
                current_time_msg = CurrentTimeMessageRequest(**data)

                a_result_update_current_time: AResult[bool] = (
                    await User.update_user_current_time(
                        session=session,
                        user_id=user_id,
                        current_time=current_time_msg.currentTime,
                    )
                )
                if a_result_update_current_time.is_not_ok():
                    logger.error(
                        f"Error updating current time. {a_result_update_current_time.info()}"
                    )

            elif message_type == "media_clicked":
                media_clicked_msg = MediaClickedMessageRequest(**data)
                logger.info(
                    f"User {user_id} media clicked: {media_clicked_msg.mediaPublicId}"
                )
            elif message_type == "skip_clicked":
                skip_clicked_msg = SkipClickedMessageRequest(**data)
                logger.info(
                    f"User {user_id} skip clicked. Media: {skip_clicked_msg.mediaPublicId}. Direction: {skip_clicked_msg.direction}"
                )
            elif message_type == "seek":
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
                    return
            else:
                logger.warning(f"Unknown message type: {message_type}")


ws_manager = WebSocketManager()
