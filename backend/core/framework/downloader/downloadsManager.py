import asyncio
import threading
from collections import defaultdict
from logging import Logger
from typing import List, Tuple

from backend.constants import DOWNLOAD_THREADS
from backend.core.aResult import AResultCode
from backend.utils.logger import getLogger
from backend.core.access.db import rockit_db
from backend.core.access.downloadAccess import DownloadAccess
from backend.core.access.userAccess import UserAccess
from backend.core.enums.downloadStatusEnum import DownloadStatusEnum

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

    pending_per_group: dict[int, int]
    """Tracks remaining pending downloads per group."""

    def __init__(self) -> None:
        self.download_threads = []
        self.downloads = []
        self.max_download_threads = DOWNLOAD_THREADS
        self.queue = []
        self.pending_per_group = defaultdict(int)

    def add_download(self, download: BaseDownload):
        """TODO"""
        self.queue.append(download)
        self.pending_per_group[download.download_group_id] += 1

    async def _update_group_completion(self, group_id: int) -> None:
        """Update the download group when all downloads are complete."""
        async with rockit_db.session_scope_async() as session:
            result = await DownloadAccess.update_download_group_completion(
                session=session, download_group_id=group_id
            )
            if result.is_not_ok():
                logger.error(
                    f"Error updating download group {group_id}: {result.message()}"
                )
            else:
                logger.info(f"Updated download group {group_id} completion status")

    async def download_manager(self):
        """Async download manager using download_method_async"""
        try:
            logger.info("Started async download manager.")
            ongoing: List[Tuple[asyncio.Task[AResultCode], BaseDownload]] = []
            group_tasks: dict[
                int, List[Tuple[asyncio.Task[AResultCode], BaseDownload]]
            ] = defaultdict(list)

            while True:
                await asyncio.sleep(0.4)

                still_ongoing: List[Tuple[asyncio.Task[AResultCode], BaseDownload]] = []
                for task, download in ongoing:
                    if task.done():
                        for group_id, tasks in group_tasks.items():
                            for t, _download in tasks:
                                if t == task:
                                    self.pending_per_group[group_id] -= 1
                                    remaining = self.pending_per_group[group_id]
                                    logger.info(
                                        f"Download completed for group {group_id}, "
                                        f"{remaining} remaining"
                                    )
                                    if remaining == 0:
                                        logger.info(
                                            f"All downloads complete for group {group_id}"
                                        )
                                        asyncio.create_task(
                                            self._update_group_completion(group_id)
                                        )
                                    break
                    else:
                        still_ongoing.append((task, download))
                ongoing = still_ongoing

                while len(ongoing) < self.max_download_threads and len(self.queue) > 0:
                    download: BaseDownload = self.queue.pop(0)
                    logger.info(f"Starting new async download: {download.public_id}")

                    async def run_download(d: BaseDownload) -> AResultCode:
                        async with rockit_db.session_scope_async() as session:
                            a_result: AResultCode = await d.download_method_async(
                                session
                            )
                            status_key = (
                                DownloadStatusEnum.COMPLETED.value
                                if a_result.is_ok()
                                else DownloadStatusEnum.FAILED.value
                            )
                            await DownloadAccess.update_download_status(
                                session=session,
                                download_id=d.download_id,
                                status_key=status_key,
                            )
                            if a_result.is_ok():
                                a_result_download_row = (
                                    await DownloadAccess.get_download_by_id(
                                        session=session, download_id=d.download_id
                                    )
                                )
                                if a_result_download_row.is_ok():
                                    download_row = a_result_download_row.result()
                                    if download_row.media_id:
                                        a_result_library = (
                                            await UserAccess.add_user_library_media(
                                                session=session,
                                                user_id=d.user_id,
                                                media_id=download_row.media_id,
                                            )
                                        )
                                        if a_result_library.is_ok():
                                            logger.info(
                                                f"Added media {download_row.media_id} to user library"
                                            )
                                        else:
                                            logger.warning(
                                                f"Could not add media to library: {a_result_library.message()}"
                                            )

                                await session.commit()
                            if a_result.is_not_ok():
                                logger.error(
                                    f"Download {d.public_id} failed with error: {a_result.message()}"
                                )
                            return AResultCode(
                                code=a_result.code(), message=a_result.message()
                            )

                    task: asyncio.Task[AResultCode] = asyncio.create_task(
                        run_download(download)
                    )
                    group_tasks[download.download_group_id].append((task, download))
                    ongoing.append((task, download))

        except Exception as e:
            logger.critical(f"Error in async download manager: {e}")
