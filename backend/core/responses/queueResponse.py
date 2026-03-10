from typing import List
from pydantic import BaseModel

from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseVideoResponse import BaseVideoResponse


class QueueResponseItem(BaseModel):
    queueMediaId: int
    listPublicId: str
    media: BaseSongWithAlbumResponse | BaseVideoResponse


class QueueResponse(BaseModel):
    currentQueueMediaId: int | None
    queue: List[QueueResponseItem]
