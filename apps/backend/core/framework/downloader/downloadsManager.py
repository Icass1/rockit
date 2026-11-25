import asyncio
import time
from collections import defaultdict
from datetime import UTC, datetime
from logging import Logger

from constants import DOWNLOAD_THREADS
from core.access.db import db_context
from core.access.db.ormModels.downloadStatus import DownloadStatusRow
from core.access.downloadAccess import DownloadAccess
from core.enums.downloadStatusEnum import TERMINAL_DOWNLOAD_STATUS_KEYS, DownloadStatusEnum
from core.framework import providers
from core.framework.contentRating import ContentRatings
from core.framework.downloader.baseDownload import BaseDownload
from core.framework.models.ongoingDownload import OngoingDownload
from core.framework.notification import Notification
from core.framework.websocket.webSocketManager import ws_manager
from logger import getLogger
from result import ResultCode

logger: Logger = getLogger(__name__)

MAX_RETRIES: int = 4

# Ordinary failures: something broke, try again shortly.
RETRY_DELAYS_SECONDS: list[float] = [30.0, 120.0, 600.0, 1800.0]

# Throttling: the provider told us to slow down, so retrying in 30 seconds only
# deepens the block. Use a longer backoff for quota and throttling failures.
RATE_LIMIT_RETRY_DELAYS_SECONDS: list[float] = [300.0, 1800.0, 3600.0, 7200.0]


class DownloadsManager:
    download_threads: list[OngoingDownload]

    max_download_threads: int

    queue: list[BaseDownload]

    pending_per_group: dict[int, int]

    delayed_queue: list[tuple[float, BaseDownload]]

    provider_semaphores: dict[str, asyncio.Semaphore]

    _retry_scheduled: set[int]

    _provider_name_cache: dict[int, str]

    def __init__(self) -> None:
        self.download_threads = []
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
            provider = providers.find_provider(provider_id)
            limit = provider.download_concurrency_limit() if provider else 2
            self.provider_semaphores[name] = asyncio.Semaphore(limit)
        return self.provider_semaphores[name]

    def add_download(self, download: BaseDownload) -> None:
        self.queue.append(download)
        self.pending_per_group[download.download_group_id] += 1

    def schedule_retry(self, download: BaseDownload, delay_seconds: float) -> None:
        ready_at: float = time.monotonic() + delay_seconds
        self.delayed_queue.append((ready_at, download))
        logger.info(
            f"Scheduled retry for {download.public_id} in {delay_seconds}s "
            f"(retry #{download.retry_count})"
        )

    def _finish_download(self, download: BaseDownload) -> None:
        group_id = download.download_group_id
        self.pending_per_group[group_id] -= 1
        if self.pending_per_group[group_id] == 0:
            del self.pending_per_group[group_id]
            asyncio.create_task(self._update_group_completion(group_id))

    def cancel_downloads(self, download_ids: set[int]) -> None:
        """Stop local workers and discard queued or delayed retries for cancelled rows."""
        removed = {
            task.download_id: task
            for task in [*self.queue, *(task for _, task in self.delayed_queue)]
            if task.download_id in download_ids
        }
        self.queue = [task for task in self.queue if task.download_id not in download_ids]
        self.delayed_queue = [
            (ready, task)
            for ready, task in self.delayed_queue
            if task.download_id not in download_ids
        ]
        for ongoing in self.download_threads:
            download_id = ongoing.download.download_id
            if download_id in download_ids:
                self._retry_scheduled.discard(download_id)
                removed.pop(download_id, None)
                ongoing.task.cancel()
        for task in removed.values():
            self._finish_download(task)

    async def _update_group_completion(self, group_id: int) -> None:
        async with db_context.session_scope_async() as session:
            result = await DownloadAccess.update_download_group_completion(
                session=session, download_group_id=group_id
            )
            if result.is_not_ok():
                logger.error(f"Error updating download group {group_id}: {result.message()}")
            else:
                logger.info(f"Updated download group {group_id} completion status")

    async def download_manager(self) -> None:
        try:
            logger.info("Started async download manager.")
            while True:
                await asyncio.sleep(0.4)

                now: float = time.monotonic()
                still_delayed: list[tuple[float, BaseDownload]] = []
                for ready_at, d in self.delayed_queue:
                    if ready_at <= now:
                        self.queue.append(d)
                        logger.info(f"Retry ready for {d.public_id}, re-queued")
                    else:
                        still_delayed.append((ready_at, d))
                self.delayed_queue = still_delayed

                still_ongoing: list[OngoingDownload] = []
                for od in self.download_threads:
                    if od.task.done():
                        did: int = od.download.download_id
                        if did in self._retry_scheduled:
                            self._retry_scheduled.discard(did)
                        else:
                            self._finish_download(od.download)
                    else:
                        still_ongoing.append(od)
                self.download_threads = still_ongoing

                while len(self.download_threads) < self.max_download_threads and self.queue:
                    download: BaseDownload = self.queue.pop(0)
                    logger.info(f"Starting new async download: {download.public_id}")

                    async def run_download(d: BaseDownload) -> ResultCode:
                        sem: asyncio.Semaphore = self._get_provider_semaphore(d.provider_id)
                        async with sem:
                            async with db_context.session_scope_async() as session:
                                status = await DownloadAccess.get_download_status_key_async(
                                    session=session, download_id=d.download_id
                                )
                                if status.is_not_ok():
                                    logger.warning(f"Queued download unavailable: {status.info()}")
                                    return ResultCode(code=status.code(), message=status.message())
                                if status.result() in TERMINAL_DOWNLOAD_STATUS_KEYS:
                                    return ResultCode(
                                        code=ResultCode.OK, message="Already finished"
                                    )
                                a_result: ResultCode = await d.download_method_async(session)
                                status = await DownloadAccess.get_download_status_key_async(
                                    session=session, download_id=d.download_id, lock=True
                                )
                                if status.is_not_ok():
                                    logger.warning(f"Download unavailable: {status.info()}")
                                    return ResultCode(code=status.code(), message=status.message())
                                if status.result() in TERMINAL_DOWNLOAD_STATUS_KEYS:
                                    await session.rollback()
                                    return ResultCode(
                                        code=ResultCode.OK, message="Already finished"
                                    )
                                if a_result.is_ok():
                                    rating = await ContentRatings.ingest_download_async(
                                        session=session, public_id=d.public_id
                                    )
                                    if rating.is_not_ok():
                                        logger.error(
                                            "Content rating persistence failed: %s", rating.info()
                                        )
                                        a_result = rating

                                if a_result.is_not_ok() and a_result.is_retryable():
                                    a_result_retry = await DownloadAccess.increment_retry_count(
                                        session=session,
                                        download_id=d.download_id,
                                    )
                                    if a_result_retry.is_ok():
                                        retry_count: int = a_result_retry.result()
                                        if retry_count <= MAX_RETRIES:
                                            delays: list[float] = (
                                                RATE_LIMIT_RETRY_DELAYS_SECONDS
                                                if a_result.is_rate_limited()
                                                else RETRY_DELAYS_SECONDS
                                            )
                                            delay: float = delays[
                                                min(retry_count - 1, len(delays) - 1)
                                            ]
                                            provider = providers.find_provider(d.provider_id)
                                            if provider is not None:
                                                delay = max(
                                                    delay,
                                                    provider.download_cooldown_remaining(),
                                                )
                                            await DownloadAccess.update_download_status(
                                                session=session,
                                                download_id=d.download_id,
                                                status_key=DownloadStatusEnum.RETRYING.value,
                                            )
                                            d.retry_count = retry_count
                                            await session.commit()
                                            self.schedule_retry(d, delay)
                                            self._retry_scheduled.add(d.download_id)
                                            _now: datetime = datetime.now(UTC)
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
                                            return ResultCode(
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
                                    return ResultCode(
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
                                        "Error getting latest status of download "
                                        f"{download_public_id}"
                                    )

                                progress: float = (
                                    100.0
                                    if status_key == DownloadStatusEnum.COMPLETED.value
                                    else (float(latest_status.completed) if latest_status else 0)
                                )
                                notification = await Notification.download_async(
                                    session=session,
                                    user_id=d.user_id,
                                    success=status_key == DownloadStatusEnum.COMPLETED.value,
                                    title=d.title,
                                )
                                if notification.is_not_ok():
                                    logger.error(
                                        f"Download notification failed: {notification.info()}"
                                    )
                                # Commit before broadcasting; an immediate inbox fetch must see
                                # the event.
                                await session.commit()
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
                                        f"Download {d.public_id} failed with error: "
                                        f"{a_result.message()}"
                                    )
                                return ResultCode(code=a_result.code(), message=a_result.message())

                    task: asyncio.Task[ResultCode] = asyncio.create_task(run_download(download))
                    od = OngoingDownload(task=task, download=download)
                    self.download_threads.append(od)

        except Exception as e:
            logger.critical(f"Error in async download manager: {e}")
