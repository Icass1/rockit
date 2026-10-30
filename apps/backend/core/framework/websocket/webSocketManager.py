import asyncio
import json
from datetime import datetime
from typing import Any, Protocol, cast

from fastapi import WebSocket
from pydantic import BaseModel, ValidationError

from core.access.db import db_context
from core.enums.downloadStatusEnum import DownloadStatusEnum
from core.framework.websocket.listenInterval import (
    close_listen_interval_on_disconnect_async,
)
from core.framework.websocket.playbackState import UserPlaybackState
from core.framework.websocket.webSocketRouter import websocket_router
from core.responses.downloadProgressMessage import DownloadProgressMessage
from core.responses.friendsPresenceChangedMessage import (
    FriendsPresenceChangedMessage,
)
from core.responses.notificationResponses import NotificationStateMessage
from core.responses.onlineUsersMessage import OnlineUsersMessage
from logger import getLogger

logger = getLogger(__name__)


class _PlaybackMessage(Protocol):
    playbackId: str
    mediaPublicId: str
    queueMediaId: int


class WebSocketManager:
    def __init__(self) -> None:
        self._presence_lock = asyncio.Lock()
        self.user_message_locks: dict[int, asyncio.Lock] = {}
        self.playback_owners: dict[int, WebSocket] = {}
        self.active_connections: dict[int, set[WebSocket]] = {}
        self.user_playback_states: dict[int, UserPlaybackState] = {}

    async def close_all_async(self, timeout_seconds: float = 2.0) -> int:
        """Close every connected client during application shutdown."""
        sockets = {
            websocket
            for connections in self.active_connections.values()
            for websocket in connections
        }
        self.active_connections.clear()
        self.playback_owners.clear()
        self.user_playback_states.clear()
        self.user_message_locks.clear()

        if not sockets:
            return 0

        close_tasks = [
            asyncio.create_task(websocket.close(code=1001, reason="Server shutting down"))
            for websocket in sockets
        ]
        done, pending = await asyncio.wait(close_tasks, timeout=timeout_seconds)
        for task in pending:
            task.cancel()
        if pending:
            await asyncio.gather(*pending, return_exceptions=True)

        for task in done:
            error = task.exception()
            if error is not None:
                logger.warning(f"Error closing WebSocket during shutdown: {error}")

        if pending:
            logger.warning(
                f"Timed out closing {len(pending)} WebSocket connection(s) during shutdown."
            )
        return len(sockets)

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        was_online = bool(self.active_connections.get(user_id))
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
            self.user_playback_states.pop(user_id, None)
            self.playback_owners.pop(user_id, None)
        self.active_connections[user_id].add(websocket)
        logger.info(f"WebSocket connected for user: {user_id}")
        if not was_online:
            await self.broadcast_online_users_async()
            await self.notify_friends_presence_async(user_id, is_online=True)
        else:
            async with self._presence_lock:
                await self.send_to_socket_async(
                    websocket, OnlineUsersMessage(count=len(self.active_connections))
                )

    async def disconnect_async(self, user_id: int, websocket: WebSocket) -> None:
        if websocket in self.active_connections.get(user_id, set()):
            self.active_connections[user_id].discard(websocket)
            if self.playback_owners.get(user_id) is websocket:
                self.playback_owners.pop(user_id, None)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                await self.broadcast_online_users_async()
                await self.notify_friends_presence_async(user_id, is_online=False)
                await close_listen_interval_on_disconnect_async(
                    user_id=user_id,
                    user_playback_states=self.user_playback_states,
                )
            logger.info(f"WebSocket disconnected for user: {user_id}")

    async def broadcast_online_users_async(self) -> None:
        # Serialize snapshots so a slower send cannot restore an older count.
        disconnected: list[tuple[int, WebSocket]] = []
        async with self._presence_lock:
            message = OnlineUsersMessage(count=len(self.active_connections))
            for user_id, sockets in tuple(self.active_connections.items()):
                for socket in tuple(sockets):
                    try:
                        await socket.send_text(message.model_dump_json())
                    except Exception:
                        disconnected.append((user_id, socket))
        # Cleanup can broadcast another snapshot; never do it while holding the lock.
        for user_id, socket in disconnected:
            await self.disconnect_async(user_id, socket)

    async def notify_friends_presence_async(self, user_id: int, is_online: bool) -> None:
        from core.framework.friend.friend import Friend

        try:
            async with db_context.session_scope_async() as session:
                friends = await Friend.get_friend_ids_async(session, user_id)
                if friends.is_not_ok():
                    logger.error("Cannot resolve presence recipients: %s", friends.info())
                    return
                friend_ids = friends.result()
                from sqlalchemy import select

                from core.access.db.ormModels.user import UserRow

                user = await session.scalar(select(UserRow).where(UserRow.id == user_id))
                if user is None:
                    return
                public_id = user.public_id
            # Only accepted mutual friends receive the changed user's public presence.
            for friend_id in friend_ids:
                await self.send_to_user_async(
                    friend_id,
                    FriendsPresenceChangedMessage(
                        userPublicId=public_id,
                        isOnline=is_online,
                    ),
                )
        except Exception:
            logger.exception("Cannot notify friends of presence change")

    async def send_social_snapshot_async(
        self, user_id: int, websocket: WebSocket | None = None
    ) -> None:
        """Send initial social state when a client connects or after a social change."""
        from core import db_context
        from core.framework.friend.notifications import build_social_snapshot_async

        try:
            async with db_context.session_scope_async() as session:
                message = await build_social_snapshot_async(session, user_id, self)
            if message is None:
                return
            if websocket is not None:
                await self.send_to_socket_async(websocket, message)
            else:
                await self.send_to_user_async(user_id=user_id, message=message)
        except Exception:
            logger.exception("Cannot send social snapshot to user %s", user_id)

    async def send_notification_state_async(
        self, user_id: int, websocket: WebSocket | None = None
    ) -> None:
        """Send unread notification counts to a newly connected client."""
        from core import db_context
        from core.access.notificationAccess import NotificationAccess

        try:
            async with db_context.session_scope_async() as session:
                result = await NotificationAccess.list_async(
                    session=session, user_id=user_id, limit=1, offset=0
                )
                if result.is_not_ok():
                    logger.error("Cannot load notification state: %s", result.info())
                    return
                _, unread_count, total_count = result.result()
            message = NotificationStateMessage(unreadCount=unread_count, totalCount=total_count)
            if websocket is not None:
                await self.send_to_socket_async(websocket, message)
            else:
                await self.send_to_user_async(user_id=user_id, message=message)
        except Exception:
            logger.exception("Cannot send notification state to user %s", user_id)

    async def send_to_user_async(
        self,
        user_id: int,
        message: BaseModel | dict[str, object],
        exclude_websocket: WebSocket | None = None,
    ) -> None:
        if user_id not in self.active_connections:
            return

        if isinstance(message, dict):
            message_str: str = json.dumps(message)
        else:
            message_str: str = message.model_dump_json()

        disconnected: set[WebSocket] = set()

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

    async def send_to_socket_async(self, websocket: WebSocket, message: BaseModel) -> None:
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
        self, user_id: int, websocket: WebSocket, data: object
    ) -> None:
        if not isinstance(data, dict):
            logger.warning(f"Invalid WebSocket payload from user {user_id}")
            return
        message_data = cast(dict[str, Any], data)
        message_type: Any = message_data.get("type")
        logger.debug(f"Received WebSocket message from user {user_id}: {message_type}")

        if not isinstance(message_type, str) or not message_type:
            logger.warning(f"Received WebSocket message without type from user {user_id}")
            return

        # Serialize state changes across devices, including their database commits.
        lock = self.user_message_locks.setdefault(user_id, asyncio.Lock())
        async with lock:
            try:
                async with db_context.session_scope_async() as session:
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

    def matches_playback(self, user_id: int, message: _PlaybackMessage) -> bool:
        """Reject positions and events from a different playback occurrence."""
        state = self.user_playback_states.get(user_id)
        return bool(
            state
            and state.playback_id == message.playbackId
            and state.media_public_id == message.mediaPublicId
            and state.queue_media_id == message.queueMediaId
        )


ws_manager = WebSocketManager()
