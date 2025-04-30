import asyncio
from typing import TYPE_CHECKING
from fastapi.responses import StreamingResponse
from fastapi import BackgroundTasks, Request

if TYPE_CHECKING:
    from downloader import Downloader


class YoutubeMusicDownloader:
    def __init__(self, downloader: "Downloader", download_id: str) -> None:
        self.download_id = download_id

    def status(self, request: Request) -> StreamingResponse:

        async def event_generator():
            while True:
                if await request.is_disconnected():
                    break
                try:
                    yield f"data: {'test'}\n\n"
                except asyncio.TimeoutError:
                    # Send keep-alive to prevent connection from closing
                    yield ": keep-alive\n\n"

        return StreamingResponse(event_generator(), media_type="text/event-stream")
