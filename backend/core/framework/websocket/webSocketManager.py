import json
from typing import Any, Dict, List, Set

from fastapi import WebSocket

from backend.core.aResult import AResult
from backend.utils.logger import getLogger

from backend.core.access.db import rockit_db
from backend.core.access.db.ormModels.media import CoreMediaRow

from backend.core.access.mediaAccess import MediaAccess
from backend.core.access.userQueueAccess import UserQueueAccess

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
        logger.info(f"WebSocket connected for user_id: {user_id}")

    def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
            logger.info(f"WebSocket disconnected for user_id: {user_id}")

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
        self, user_id: int, download_id: int, status: str, progress: float, message: str
    ) -> None:
        download_message: DownloadProgressMessage = DownloadProgressMessage(
            download_id=download_id,
            status=status,
            progress=progress,
            message=message,
        )
        await self.send_to_user(user_id, download_message)

    async def handle_client_message(self, user_id: int, data: dict[str, Any]) -> None:
        message_type = data.get("type")
        logger.info(f"Received WebSocket message from user {user_id}: {message_type}")

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

            try:
                async with rockit_db.session_scope_async() as session:
                    a_result = await User.update_user_current_media(
                        session=session,
                        user_id=user_id,
                        queue_media_id=current_media_msg.queueMediaId,
                        media_public_id=current_media_msg.mediaPublicId,
                    )
                    if a_result.is_not_ok():
                        logger.error(f"Error updating current media. {a_result.info()}")
            except Exception as e:
                logger.error(f"Error updating current media: {e}", exc_info=True)

        elif message_type == "current_queue":
            current_queue_msg = CurrentQueueMessageRequest(**data)

            try:
                async with rockit_db.session_scope_async() as session:

                    a_result_media: AResult[List[CoreMediaRow]] = (
                        await MediaAccess.get_medias_from_public_ids_async(
                            session=session,
                            public_ids=[
                                item.publicId for item in current_queue_msg.queue
                            ],
                            media_type_key=None,
                        )
                    )

                    queue_items: list[tuple[int, int]] = []

                    for item in current_queue_msg.queue:

                        item_id: int | None = None

                        for row in a_result_media.result():
                            if row.public_id == item.publicId:
                                item_id = row.id

                        if item_id == None:
                            logger.error(
                                f"Item with public id {item.publicId} not found in media table"
                            )
                            continue

                        queue_items.append((item.queueMediaId, item_id))

                    await UserQueueAccess.save_user_queue(
                        session=session,
                        user_id=user_id,
                        queue_items=queue_items,
                        queue_type=current_queue_msg.queueType,
                    )
            except Exception as e:
                logger.error(f"Error saving user queue: {e}", exc_info=True)
        elif message_type == "current_time":
            current_time_msg = CurrentTimeMessageRequest(**data)

            try:
                async with rockit_db.session_scope_async() as session:
                    a_result = await User.update_user_current_time(
                        session=session,
                        user_id=user_id,
                        current_time=current_time_msg.currentTime,
                    )
                    if a_result.is_not_ok():
                        logger.error(f"Error updating current time. {a_result.info()}")
            except Exception as e:
                logger.error(f"Error updating current time: {e}", exc_info=True)

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
            logger.info(
                f"User {user_id} seek to: {seek_msg.timeFrom} -> {seek_msg.timeTo}"
            )
        else:
            logger.warning(f"Unknown message type: {message_type}")


ws_manager = WebSocketManager()
