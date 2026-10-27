from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class FriendRequestResponse(BaseModel):
    publicId: str
    fromUserPublicId: str
    fromUsername: str
    fromUserImageUrl: str | None = None
    message: str | None = None
    status: Literal["pending", "accepted", "blocked", "rejected"]
    dateAdded: datetime


class FriendRequestListResponse(BaseModel):
    incoming: list[FriendRequestResponse]
    sent: list[FriendRequestResponse]
