from typing import Dict, Set
import json
from dataclasses import dataclass, asdict

from fastapi import WebSocket

from backend.utils.logger import getLogger

logger = getLogger(__name__)


@dataclass
class DownloadProgress:
    download_id: int
    status: str
    progress: float
    message: str


class DownloadWebSocketManager:
    def __init__(self) -> None:
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, download_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        if download_id not in self.active_connections:
            self.active_connections[download_id] = set()
        self.active_connections[download_id].add(websocket)
        logger.info(f"WebSocket connected for download_id: {download_id}")

    def disconnect(self, download_id: int, websocket: WebSocket) -> None:
        if download_id in self.active_connections:
            self.active_connections[download_id].discard(websocket)
            if not self.active_connections[download_id]:
                del self.active_connections[download_id]
            logger.info(f"WebSocket disconnected for download_id: {download_id}")

    async def send_progress(self, download_id: int, progress: DownloadProgress) -> None:
        if download_id not in self.active_connections:
            return

        message: str = json.dumps(asdict(progress))
        disconnected: Set[WebSocket] = set()

        for websocket in self.active_connections[download_id]:
            try:
                await websocket.send_text(message)
            except Exception as e:
                logger.error(f"Error sending to websocket: {e}")
                disconnected.add(websocket)

        for ws in disconnected:
            self.disconnect(download_id, ws)

    async def broadcast_progress(
        self, download_id: int, status: str, progress: float, message: str
    ) -> None:
        await self.send_progress(
            download_id,
            DownloadProgress(
                download_id=download_id,
                status=status,
                progress=progress,
                message=message,
            ),
        )


download_ws_manager = DownloadWebSocketManager()
