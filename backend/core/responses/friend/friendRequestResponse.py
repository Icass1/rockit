from datetime import datetime
from typing import List

from pydantic import BaseModel, field_serializer

from backend.core.enums.friend.friendStatusEnum import FriendStatusEnum


class FriendRequestResponse(BaseModel):
    publicId: str
    fromUserPublicId: str
    fromUsername: str
    fromUserImageUrl: str | None = None
    message: str | None = None
    status: FriendStatusEnum
    dateAdded: datetime

    @field_serializer("status")
    def serialize_status(self, status: FriendStatusEnum) -> str:
        return status.name.lower()


class FriendRequestListResponse(BaseModel):
    incoming: List[FriendRequestResponse]
    sent: List[FriendRequestResponse]
