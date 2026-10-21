from datetime import datetime
from typing import List

from pydantic import BaseModel


class FriendResponse(BaseModel):
    publicId: str
    username: str
    imageUrl: str | None = None
    status: str  # "accepted" | "pending" | "blocked"
    isOnline: bool = False
    nowPlaying: str | None = None
    level: int = 1
    levelTitle: str | None = None
    dateAdded: datetime


class FriendListResponse(BaseModel):
    friends: List[FriendResponse]
