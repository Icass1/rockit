from typing import Literal
from pydantic import BaseModel, Field


class SearchProviderRequest(BaseModel):
    query: str = Field(min_length=2, max_length=200)
    providerId: str
    limit: int = Field(default=15, ge=15, le=100)
    mediaType: (
        Literal["song", "album", "artist", "playlist", "video", "radio"] | None
    ) = None
