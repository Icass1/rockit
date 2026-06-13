from typing import List

from pydantic import BaseModel


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
    status: str  # "active" | "ended"


class ListenTogetherListResponse(BaseModel):
    sessions: List[ListenTogetherSessionResponse]
