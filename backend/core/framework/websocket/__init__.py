import importlib as _importlib

from backend.core.framework.websocket.webSocketManager import WebSocketManager, ws_manager

# Load message handlers to register them with websocket_router
_importlib.import_module("backend.core.framework.websocket.handlers")

__all__ = ["WebSocketManager", "ws_manager"]
