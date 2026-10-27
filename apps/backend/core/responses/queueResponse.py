from pydantic import BaseModel, field_serializer

from core.enums.queueTypeEnum import QueueTypeEnum
from core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from core.responses.baseSongWithoutAlbumResponse import (
    BaseSongWithoutAlbumResponse,
)
from core.responses.baseStationResponse import BaseStationResponse
from core.responses.baseVideoResponse import BaseVideoResponse


class QueueResponseItem(BaseModel):
    queueMediaId: int
    listPublicId: str | None
    media: (
        BaseSongWithAlbumResponse
        | BaseVideoResponse
        | BaseSongWithoutAlbumResponse
        | BaseStationResponse
    )
    randomIndex: int
    sortedIndex: int


class QueueResponse(BaseModel):
    currentQueueMediaId: int | None
    queue: list[QueueResponseItem]
    queueType: QueueTypeEnum

    @field_serializer("queueType")
    def serialize_queue_type(self, queue_type: QueueTypeEnum) -> str:
        return queue_type.name
