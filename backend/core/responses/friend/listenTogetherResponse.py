from typing import List

from pydantic import BaseModel, field_serializer

from backend.core.enums.friend.listenTogetherStatusEnum import (
    ListenTogetherStatusEnum,
)


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
    status: ListenTogetherStatusEnum

    @field_serializer("status")
    def serialize_status(self, status: ListenTogetherStatusEnum) -> str:
        return status.name.lower()


class ListenTogetherListResponse(BaseModel):
    sessions: List[ListenTogetherSessionResponse]
