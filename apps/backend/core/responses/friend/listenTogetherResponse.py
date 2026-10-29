from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from core.responses.mediaResponse import MediaResponse


class ListenTogetherSessionResponse(BaseModel):
    publicId: str
    hostPublicId: str
    hostUsername: str
    hostImageUrl: str | None = None
    guestPublicId: str
    guestUsername: str
    guestImageUrl: str | None = None
    currentMediaPublicId: str | None = None
    currentMediaName: str | None = None
    currentMediaImageUrl: str | None = None
    currentTimeMs: int = 0
    isPlaying: bool = False
    updatedAt: datetime
    currentMedia: MediaResponse | None = None
    status: Literal["active", "invited", "ended"]


class ListenTogetherListResponse(BaseModel):
    sessions: list[ListenTogetherSessionResponse]
