from __future__ import annotations

from typing import TYPE_CHECKING, Any, Callable, Coroutine, Dict
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

if TYPE_CHECKING:
    from backend.core.framework.websocket.webSocketManager import WebSocketManager

logger = getLogger(__name__)

HandlerFunc = Callable[
    ["WebSocketManager", AsyncSession, int, Dict[str, Any]],
    Coroutine[Any, Any, None],
]


class WebSocketRouter:
    def __init__(self) -> None:
        self._handlers: Dict[str, HandlerFunc] = {}

    def message(self, message_type: str) -> Callable[[HandlerFunc], HandlerFunc]:
        """Decorator to register a handler for a WebSocket message type."""

        logger.info(f"Registering web socket message handler for {message_type}")

        def decorator(func: HandlerFunc) -> HandlerFunc:
            self._handlers[message_type] = func
            return func

        return decorator

    async def dispatch(
        self,
        manager: "WebSocketManager",
        session: AsyncSession,
        user_id: int,
        message_type: str,
        data: Dict[str, Any],
    ) -> None:
        handler = self._handlers.get(message_type)
        if handler is None:
            logger.warning(f"Unknown WebSocket message type: {message_type}")
            return
        await handler(manager, session, user_id, data)


websocket_router = WebSocketRouter()
