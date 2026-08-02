from typing import List, Literal

from pydantic import BaseModel


class AdminSearchResultItem(BaseModel):
    internalId: int
    publicId: str | None
    name: str
    type: Literal["artist", "album", "playlist", "song", "video", "radio"]
    provider: str
    imageUrl: str | None
    score: float


class AdminSearchResponse(BaseModel):
    results: List[AdminSearchResultItem]
