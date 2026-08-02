from typing import List

from pydantic import BaseModel

from backend.core.enums.mediaTypeEnum import MediaTypeName as _MediaTypeName


class AdminSearchResultItem(BaseModel):
    internalId: int
    publicId: str | None
    name: str
    subtitle: str | None = None
    type: _MediaTypeName
    provider: str
    imageUrl: str | None
    score: float


class AdminSearchResponse(BaseModel):
    results: List[AdminSearchResultItem]
