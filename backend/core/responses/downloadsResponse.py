from pydantic import BaseModel
from typing import List


class DownloadItemResponse(BaseModel):
    publicId: str
    name: str
    completed: float
    message: str


class DownloadGroupResponse(BaseModel):
    publicId: str
    title: str
    dateStarted: str
    success: int
    fail: int
    items: List[DownloadItemResponse]


class DownloadsResponse(BaseModel):
    downloads: List[DownloadGroupResponse]
