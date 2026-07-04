import asyncio
import time
from collections import defaultdict
from logging import Logger
from typing import Dict, List, Tuple

from datetime import datetime, timezone

from backend.constants import DOWNLOAD_THREADS
from backend.core.aResult import AResultCode
from backend.utils.logger import getLogger
from backend.core.access.db import rockit_db
from backend.core.access.downloadAccess import DownloadAccess
from backend.core.access.db.ormModels.downloadStatus import DownloadStatusRow
from backend.core.enums.downloadStatusEnum import DownloadStatusEnum

from backend.core.framework import providers
from backend.core.framework.downloader.baseDownload import BaseDownload
from backend.core.framework.models.ongoingDownload import OngoingDownload
from backend.core.framework.websocket.webSocketManager import ws_manager

logger: Logger = getLogger(__name__)

MAX_RETRIES: int = 3
RETRY_DELAYS_SECONDS: List[float] = [30.0, 120.0, 600.0]

PROVIDER_CONCURRENCY_LIMITS: Dict[str, int] = {
    "SpotifyScrapper": 2,
    "YouTube": 1,
    "YouTube Music": 1,
    "RockIt": 3,
    "Default": 2,
}
_DEFAULT_PROVIDER_LIMIT: int = 2


class DownloadsManager:

    downloads: List[BaseDownload]

    download_threads: list[OngoingDownload]

    max_download_threads: int

    queue: List[BaseDownload]

    pending_per_group: dict[int, int]

    delayed_queue: List[Tuple[float, BaseDownload]]

    provider_semaphores: Dict[str, asyncio.Semaphore]

    _retry_scheduled: set[int]

    _provider_name_cache: dict[int, str]

    def __init__(self) -> None:
        self.download_threads = []
        self.downloads = []
        self.max_download_threads = DOWNLOAD_THREADS
        self.queue = []
        self.pending_per_group = defaultdict(int)
        self.delayed_queue = []
        self.provider_semaphores = {}
        self._retry_scheduled = set()
        self._provider_name_cache = {}

    def _get_provider_name(self, provider_id: int) -> str:
        if provider_id not in self._provider_name_cache:
            provider = providers.find_provider(provider_id)
            name = provider.get_name() if provider else str(provider_id)
            self._provider_name_cache[provider_id] = name
        return self._provider_name_cache[provider_id]

    def _get_provider_semaphore(self, provider_id: int) -> asyncio.Semaphore:
        name: str = self._get_provider_name(provider_id)
        if name not in self.provider_semaphores:
            limit: int = PROVIDER_CONCURRENCY_LIMITS.get(name, _DEFAULT_PROVIDER_LIMIT)
            self.provider_semaphores[name] = asyncio.Semaphore(limit)
        return self.provider_semaphores[name]

    def add_download(self, download: BaseDownload):
        self.queue.append(download)
        self.pending_per_group[download.download_group_id] += 1

    def schedule_retry(self, download: BaseDownload, delay_seconds: float) -> None:
        ready_at: float = time.monotonic() + delay_seconds
        self.delayed_queue.append((ready_at, download))
        logger.info(
            f"Scheduled retry for {download.public_id} in {delay_seconds}s "
            f"(retry #{download.retry_count})"
        )

    async def _update_group_completion(self, group_id: int) -> None:
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
        try:
            logger.info("Started async download manager.")
            ongoing: List[OngoingDownload] = []
            group_tasks: dict[int, List[OngoingDownload]] = defaultdict(list)

            while True:
                await asyncio.sleep(0.4)

                now: float = time.monotonic()
                still_delayed: List[Tuple[float, BaseDownload]] = []
                for ready_at, d in self.delayed_queue:
                    if ready_at <= now:
                        self.queue.append(d)
                        logger.info(
                            f"Retry ready for {d.public_id}, re-queued"
                        )
                    else:
                        still_delayed.append((ready_at, d))
                self.delayed_queue = still_delayed

                still_ongoing: List[OngoingDownload] = []
                for od in ongoing:
                    if od.task.done():
                        did: int = od.download.download_id
                        if did in self._retry_scheduled:
                            self._retry_scheduled.discard(did)
                        else:
                            for group_id, tasks in group_tasks.items():
                                for gt in tasks:
                                    if gt.task == od.task:
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
                        still_ongoing.append(od)
                ongoing = still_ongoing

                while len(ongoing) < self.max_download_threads and len(self.queue) > 0:
                    download: BaseDownload = self.queue.pop(0)
                    logger.info(f"Starting new async download: {download.public_id}")

                    async def run_download(d: BaseDownload) -> AResultCode:
                        sem: asyncio.Semaphore = (
                            self._get_provider_semaphore(d.provider_id)
                        )
                        async with sem:
                            async with rockit_db.session_scope_async() as session:
                                a_result: AResultCode = await d.download_method_async(
                                    session
                                )

                                if (
                                    a_result.is_not_ok()
                                    and a_result.is_retryable()
                                ):
                                    a_result_retry = (
                                        await DownloadAccess.increment_retry_count(
                                            session=session,
                                            download_id=d.download_id,
                                        )
                                    )
                                    if a_result_retry.is_ok():
                                        retry_count: int = a_result_retry.result()
                                        if retry_count <= MAX_RETRIES:
                                            delay: float = RETRY_DELAYS_SECONDS[
                                                min(
                                                    retry_count - 1,
                                                    len(RETRY_DELAYS_SECONDS) - 1,
                                                )
                                            ]
                                            await DownloadAccess.update_download_status(
                                                session=session,
                                                download_id=d.download_id,
                                                status_key=DownloadStatusEnum.RETRYING.value,
                                            )
                                            d.retry_count = retry_count
                                            await session.commit()
                                            self.schedule_retry(d, delay)
                                            self._retry_scheduled.add(d.download_id)
                                            _now: datetime = datetime.now(timezone.utc)
                                            await ws_manager.broadcast_progress_async(
                                                user_id=d.user_id,
                                                download_public_id=d.public_id,
                                                media_public_id=d.public_id,
                                                title=d.title,
                                                subTitle=d.artist,
                                                status=DownloadStatusEnum.RETRYING,
                                                progress=0.0,
                                                date_started=_now,
                                                date_ended=None,
                                                retry_count=retry_count,
                                            )
                                            return AResultCode(
                                                code=a_result.code(),
                                                message=a_result.message(),
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

                                a_result_download_row = (
                                    await DownloadAccess.finalize_download_async(
                                        session=session,
                                        download_id=d.download_id,
                                        status_key=status_key,
                                    )
                                )
                                if a_result_download_row.is_not_ok():
                                    logger.error(
                                        f"Error finalizing download. {a_result_download_row.info()}"
                                    )
                                    return AResultCode(
                                        code=a_result_download_row.code(),
                                        message=a_result_download_row.message(),
                                    )

                                download_row = a_result_download_row.result()
                                download_public_id = download_row.public_id
                                date_started = download_row.date_started
                                date_ended = download_row.date_ended

                                latest_status: DownloadStatusRow | None = (
                                    download_row.download_status_list[-1]
                                    if download_row.download_status_list
                                    else None
                                )

                                if not latest_status:
                                    logger.error(
                                        f"Error getting latest status of download {download_public_id}"
                                    )

                                progress: float = (
                                    100.0
                                    if status_key == DownloadStatusEnum.COMPLETED.value
                                    else (
                                        float(latest_status.completed)
                                        if latest_status
                                        else 0
                                    )
                                )
                                await ws_manager.broadcast_progress_async(
                                    user_id=d.user_id,
                                    download_public_id=download_public_id,
                                    media_public_id=d.public_id,
                                    title=d.title,
                                    subTitle=d.artist,
                                    status=DownloadStatusEnum(download_row.status_key),
                                    progress=progress,
                                    date_started=date_started,
                                    date_ended=date_ended,
                                )

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
                    od = OngoingDownload(task=task, download=download)
                    group_tasks[download.download_group_id].append(od)
                    ongoing.append(od)

        except Exception as e:
            logger.critical(f"Error in async download manager: {e}")
