from typing import List
from datetime import datetime
from backend.core.responses.mediaResponse import MediaResponse

from pydantic import BaseModel
from typing import Literal


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
    sessions: List[ListenTogetherSessionResponse]
