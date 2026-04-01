from pydantic import BaseModel
from typing import List


class DownloadItemResponse(BaseModel):
    publicId: str
    name: str
    subtitle: str | None = None
    imageUrl: str | None = None
    completed: float
    message: str
    dateAdded: str = ""


class DownloadGroupResponse(BaseModel):
    publicId: str
    title: str
    dateStarted: str
    success: int
    fail: int
    items: List[DownloadItemResponse]


class DownloadsResponse(BaseModel):
    downloads: List[DownloadGroupResponse]
