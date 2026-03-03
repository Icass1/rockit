from typing import List
from pydantic import BaseModel

from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse


class QueueResponseItem(BaseModel):
    queueMediaId: int
    listPublicId: str
    song: BaseSongWithAlbumResponse


class QueueResponse(BaseModel):
    currentQueueMediaId: int | None
    queue: List[QueueResponseItem]
