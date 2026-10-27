import asyncio
from dataclasses import dataclass

from core.aResult import AResultCode
from core.framework.downloader.baseDownload import BaseDownload


@dataclass
class OngoingDownload:
    """A download task with its associated download info."""

    task: asyncio.Task[AResultCode]
    download: BaseDownload
