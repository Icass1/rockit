from typing import List
from pydantic import BaseModel

from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse


class QueueResponseItem(BaseModel):
    queueSongId: int
    listPublicId: str
    song: BaseSongWithAlbumResponse


class QueueResponse(BaseModel):
    currentQueueSongId: int | None
    queue: List[QueueResponseItem]
