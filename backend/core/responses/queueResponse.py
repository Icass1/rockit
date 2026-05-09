from typing import List
from pydantic import BaseModel

from backend.core.responses.baseVideoResponse import BaseVideoResponse
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseSongWithoutAlbumResponse import (
    BaseSongWithoutAlbumResponse,
)


class QueueResponseItem(BaseModel):
    queueMediaId: int
    listPublicId: str
    media: BaseSongWithAlbumResponse | BaseVideoResponse | BaseSongWithoutAlbumResponse


class QueueResponse(BaseModel):
    currentQueueMediaId: int | None
    queue: List[QueueResponseItem]
