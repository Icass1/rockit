from datetime import datetime

from pydantic import field_serializer

from core.baseModel import BaseModel
from core.enums.downloadStatusEnum import DownloadStatusEnum


class DownloadItemResponse(BaseModel):
    publicId: str
    mediaPublicId: str
    name: str
    subtitle: str | None = None
    status: DownloadStatusEnum
    progress: float
    imageUrl: str | None = None
    dateStarted: datetime
    dateEnded: datetime | None
    contentType: str
    retryCount: int = 0

    @field_serializer("status")
    def serialize_repeat_mode(self, status: DownloadStatusEnum) -> str:
        return status.name


class DownloadGroupResponse(BaseModel):
    publicId: str
    name: str
    dateStarted: datetime
    dateEnded: datetime | None
    success: int
    fail: int
    items: list[DownloadItemResponse]
    sourcePublicId: str | None = None


class DownloadsResponse(BaseModel):
    downloads: list[DownloadGroupResponse]
