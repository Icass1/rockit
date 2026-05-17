from dataclasses import dataclass

import asyncio

from backend.core.aResult import AResultCode
from backend.core.framework.downloader.baseDownload import BaseDownload


@dataclass
class OngoingDownload:
    """A download task with its associated download info."""

    task: asyncio.Task[AResultCode]
    download: BaseDownload
