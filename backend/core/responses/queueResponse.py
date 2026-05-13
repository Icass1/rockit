from typing import List
from pydantic import BaseModel, field_serializer

from backend.core.enums.queueTypeEnum import QueueTypeEnum

from backend.core.responses.baseVideoResponse import BaseVideoResponse
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseSongWithoutAlbumResponse import (
    BaseSongWithoutAlbumResponse,
)


class QueueResponseItem(BaseModel):
    queueMediaId: int
    listPublicId: str
    media: BaseSongWithAlbumResponse | BaseVideoResponse | BaseSongWithoutAlbumResponse
    queueType: QueueTypeEnum

    @field_serializer("queueType")
    def serialize_queue_type(self, queue_type: QueueTypeEnum) -> str:
        return queue_type.name


class QueueResponse(BaseModel):
    currentQueueMediaId: int | None
    queue: List[QueueResponseItem]
    queueType: QueueTypeEnum

    @field_serializer("queueType")
    def serialize_queue_type(self, queue_type: QueueTypeEnum) -> str:
        return queue_type.name
