from datetime import datetime
from typing import List

from pydantic import BaseModel


class FriendRequestResponse(BaseModel):
    publicId: str
    fromUserPublicId: str
    fromUsername: str
    fromUserImageUrl: str | None = None
    message: str | None = None
    status: str  # "pending" | "accepted" | "rejected"
    dateAdded: datetime


class FriendRequestListResponse(BaseModel):
    incoming: List[FriendRequestResponse]
    sent: List[FriendRequestResponse]
