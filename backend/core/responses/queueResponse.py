from typing import List
from pydantic import BaseModel

from backend.core.responses.baseSongResponse import BaseSongResponse


class QueueResponseItemList(BaseModel):
    publicId: str


class QueueResponseItem(BaseModel):
    queueSongId: int
    list: QueueResponseItemList
    song: BaseSongResponse


class QueueResponse(BaseModel):
    currentQueueSongId: int | None
    queue: List[QueueResponseItem]
