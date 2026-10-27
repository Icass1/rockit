import asyncio
from dataclasses import dataclass

from core.framework.downloader.baseDownload import BaseDownload
from result import ResultCode


@dataclass
class OngoingDownload:
    """A download task with its associated download info."""

    task: asyncio.Task[ResultCode]
    download: BaseDownload
