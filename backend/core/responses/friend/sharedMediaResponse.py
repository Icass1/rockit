from datetime import datetime
from typing import List

from pydantic import BaseModel


class SharedMediaItem(BaseModel):
    publicId: str
    senderPublicId: str
    senderUsername: str
    senderImageUrl: str | None = None
    mediaPublicId: str
    mediaName: str
    mediaImageUrl: str | None = None
    mediaType: str
    artistName: str | None = None
    message: str | None = None
    seen: bool
    dateAdded: datetime


class SharedMediaInboxResponse(BaseModel):
    items: List[SharedMediaItem]


class SharedMediaSentResponse(BaseModel):
    items: List[SharedMediaItem]
