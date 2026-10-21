from datetime import datetime
from pydantic import field_serializer

from typing import Literal

from backend.core.enums.downloadStatusEnum import DownloadStatusEnum
from backend.core.baseModel import BaseModel


class DownloadProgressMessage(BaseModel):
    type: Literal["download_progress"] = "download_progress"
    publicId: str
    mediaPublicId: str
    name: str
    subtitle: str | None = None
    status: DownloadStatusEnum
    progress: float
    imageUrl: str | None = None
    dateStarted: datetime
    dateEnded: datetime | None
    retryCount: int = 0

    @field_serializer("status")
    def serialize_repeat_mode(self, status: DownloadStatusEnum) -> str:
        return status.name
