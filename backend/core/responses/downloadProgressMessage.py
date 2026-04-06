from pydantic import BaseModel
from typing import Literal

from backend.core.framework.downloader.types import DownloadStatus


class DownloadProgressMessage(BaseModel):
    type: Literal["download_progress"]
    download_id: int
    publicId: str
    title: str
    subTitle: str
    status: DownloadStatus
    progress: float
    message: str
