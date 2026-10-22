from datetime import datetime
from typing import List

from pydantic import BaseModel
from typing import Literal


class FriendRequestResponse(BaseModel):
    publicId: str
    fromUserPublicId: str
    fromUsername: str
    fromUserImageUrl: str | None = None
    message: str | None = None
    status: Literal["pending", "accepted", "blocked", "rejected"]
    dateAdded: datetime


class FriendRequestListResponse(BaseModel):
    incoming: List[FriendRequestResponse]
    sent: List[FriendRequestResponse]
