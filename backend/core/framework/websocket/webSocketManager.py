import json
import asyncio
from pydantic import ValidationError
from datetime import datetime
from typing import Any, Dict, Set, cast

from fastapi import WebSocket

from backend.utils.logger import getLogger

from backend.core.enums.downloadStatusEnum import DownloadStatusEnum

from backend.core.access.db import rockit_db

from backend.core.framework.websocket.playbackState import UserPlaybackState
from backend.core.framework.websocket.webSocketRouter import websocket_router
from backend.core.framework.websocket.listenInterval import (
    close_listen_interval_on_disconnect_async,
)

from backend.core.responses.downloadProgressMessage import DownloadProgressMessage

logger = getLogger(__name__)


class WebSocketManager:
    def __init__(self) -> None:
        self.user_message_locks: Dict[int, asyncio.Lock] = {}
        self.playback_owners: Dict[int, WebSocket] = {}
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        self.user_playback_states: Dict[int, UserPlaybackState] = {}

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
            self.user_playback_states.pop(user_id, None)
            self.playback_owners.pop(user_id, None)
        self.active_connections[user_id].add(websocket)
        logger.info(f"WebSocket connected for user: {user_id}")

    async def disconnect_async(self, user_id: int, websocket: WebSocket) -> None:
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if self.playback_owners.get(user_id) is websocket:
                self.playback_owners.pop(user_id, None)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                await close_listen_interval_on_disconnect_async(
                    user_id=user_id,
                    user_playback_states=self.user_playback_states,
                )
            logger.info(f"WebSocket disconnected for user: {user_id}")

    async def send_to_user_async(
        self, user_id: int, message: Any, exclude_websocket: WebSocket | None = None
    ) -> None:
        if user_id not in self.active_connections:
            return

        if isinstance(message, dict):
            message_str: str = json.dumps(message)
        else:
            message_str: str = message.model_dump_json()

        disconnected: Set[WebSocket] = set()

        for websocket in tuple(self.active_connections[user_id]):
            if exclude_websocket and websocket == exclude_websocket:
                continue
            try:
                await websocket.send_text(message_str)
            except Exception as e:
                logger.error(f"Error sending to websocket: {e}")
                disconnected.add(websocket)

        for ws in disconnected:
            await self.disconnect_async(user_id=user_id, websocket=ws)

    async def send_to_socket_async(self, websocket: WebSocket, message: Any) -> None:
        """Send an ownership acknowledgement without interrupting message dispatch."""
        try:
            await websocket.send_text(message.model_dump_json())
        except Exception as error:
            logger.error(f"Error sending playback acknowledgement: {error}")

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
        retry_count: int = 0,
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
            retryCount=retry_count,
        )
        await self.send_to_user_async(user_id=user_id, message=download_message)

    async def handle_client_message_async(
        self, user_id: int, websocket: WebSocket, data: Any
    ) -> None:
        if not isinstance(data, dict):
            logger.warning(f"Invalid WebSocket payload from user {user_id}")
            return
        message_data = cast(Dict[str, Any], data)
        message_type: Any = message_data.get("type")
        logger.debug(f"Received WebSocket message from user {user_id}: {message_type}")

        if not isinstance(message_type, str) or not message_type:
            logger.warning(
                f"Received WebSocket message without type from user {user_id}"
            )
            return

        # Serialize state changes across devices, including their database commits.
        lock = self.user_message_locks.setdefault(user_id, asyncio.Lock())
        async with lock:
            try:
                async with rockit_db.session_scope_async() as session:
                    await websocket_router.dispatch(
                        manager=self,
                        session=session,
                        user_id=user_id,
                        message_type=message_type,
                        data=message_data,
                        sender_websocket=websocket,
                    )
            except (ValidationError, ValueError, TypeError, KeyError) as error:
                logger.warning(f"Invalid WebSocket message for user {user_id}: {error}")

    def matches_playback(self, user_id: int, message: Any) -> bool:
        """Reject positions and events from a different playback occurrence."""
        state = self.user_playback_states.get(user_id)
        return bool(
            state
            and state.playback_id == message.playbackId
            and state.media_public_id == message.mediaPublicId
            and state.queue_media_id == message.queueMediaId
        )


ws_manager = WebSocketManager()
