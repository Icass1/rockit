from typing import List
from pydantic import BaseModel


class QueueResponseItemList(BaseModel):
    publicId: str


class QueueResponseItem(BaseModel):
    queueSongId: int
    list: QueueResponseItemList


class QueueResponse(BaseModel):
    currentQueueSongId: int | None
    queue: List[QueueResponseItem]
