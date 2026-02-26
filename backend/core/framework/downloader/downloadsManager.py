import asyncio
import threading
from logging import Logger
from typing import List, Tuple

from backend.core.aResult import AResultCode
from backend.utils.logger import getLogger

from backend.core.framework.downloader.baseDownload import BaseDownload

logger: Logger = getLogger(__name__)


class DownloadsManager:

    downloads: List[BaseDownload]
    """List of downloads."""

    download_threads: List[Tuple[threading.Thread, BaseDownload]]
    """TODO"""

    max_download_threads: int
    """Maximun number of concurrent downloads"""

    queue: List[BaseDownload]

    def __init__(self) -> None:
        self.download_threads = []
        self.downloads = []
        self.max_download_threads = 1
        self.queue = []

    def add_download(self, download: BaseDownload):
        """TODO"""
        self.queue.append(download)

    async def download_manager(self):
        """Async download manager using download_method_async"""
        try:
            logger.info("Started async download manager.")
            ongoing_tasks: List[asyncio.Task[AResultCode]] = []

            while True:
                await asyncio.sleep(0.4)

                # Remove finished tasks
                ongoing_tasks = [t for t in ongoing_tasks if not t.done()]

                # Start new downloads if under limit
                while (
                    len(ongoing_tasks) < self.max_download_threads
                    and len(self.queue) > 0
                ):
                    download: BaseDownload = self.queue.pop(0)
                    logger.info(f"Starting new async download: {download.public_id}")

                    task: asyncio.Task[AResultCode] = asyncio.create_task(
                        download.download_method_async()
                    )
                    ongoing_tasks.append(task)

        except Exception as e:
            logger.critical(f"Error in async download manager: {e}")
