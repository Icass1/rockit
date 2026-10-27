from __future__ import annotations

from collections.abc import Callable, Coroutine
from typing import TYPE_CHECKING, Any, TypeVar

from fastapi import WebSocket
from sqlalchemy.ext.asyncio import AsyncSession

from logger import getLogger

if TYPE_CHECKING:
    from core.framework.websocket.webSocketManager import WebSocketManager

logger = getLogger(__name__)

HandlerFunc = Callable[
    ["WebSocketManager", AsyncSession, int, dict[str, Any], WebSocket | None],
    Coroutine[Any, Any, None],
]


Handler = TypeVar("Handler", bound=HandlerFunc)


class WebSocketRouter:
    def __init__(self) -> None:
        self._handlers: dict[str, HandlerFunc] = {}

    def message(self, message_type: str) -> Callable[[Handler], Handler]:
        """Decorator to register a handler for a WebSocket message type."""

        logger.info(f"Registering web socket message handler for {message_type}")

        def decorator(func: Handler) -> Handler:
            self._handlers[message_type] = func
            return func

        return decorator

    async def dispatch(
        self,
        manager: WebSocketManager,
        session: AsyncSession,
        user_id: int,
        message_type: str,
        data: dict[str, Any],
        sender_websocket: WebSocket | None = None,
    ) -> None:
        handler = self._handlers.get(message_type)
        if handler is None:
            logger.warning(f"Unknown WebSocket message type: {message_type}")
            return
        await handler(manager, session, user_id, data, sender_websocket)


websocket_router = WebSocketRouter()
