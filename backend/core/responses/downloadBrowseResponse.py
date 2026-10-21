from backend.core.baseModel import BaseModel
from backend.core.responses.downloadsResponse import (
    DownloadGroupResponse,
    DownloadItemResponse,
)


class DownloadTotalsResponse(BaseModel):
    total: int = 0
    active: int = 0
    completed: int = 0
    failed: int = 0
    daily: list[int] = []


class DownloadBrowseGroupResponse(DownloadGroupResponse):
    total: int
    active: int
    matching: int
    imageUrl: str | None = None
    sourceType: str | None = None
    provider: str = ""
    providerUrl: str = ""
    sourceUrl: str = ""
    inLibrary: bool = False
    hasMoreItems: bool = False
    canManage: bool = False


class DownloadBrowseResponse(BaseModel):
    groups: list[DownloadBrowseGroupResponse]
    totals: DownloadTotalsResponse
    page: int
    hasMore: bool


class DownloadItemsPageResponse(BaseModel):
    items: list[DownloadItemResponse]
    offset: int
    total: int
    hasMore: bool
