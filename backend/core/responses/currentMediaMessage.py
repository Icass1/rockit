from pydantic import field_serializer, field_validator
from typing import Literal

from backend.core.baseModel import BaseModel
from backend.core.enums.queueTypeEnum import QueueTypeEnum


class CurrentMediaMessage(BaseModel):
    type: Literal["current_media"] = "current_media"
    isPlaybackOwner: bool = False
    playbackId: str
    currentTimeMs: int = 0
    mediaPublicId: str
    queueMediaId: int
    queueType: QueueTypeEnum

    @field_serializer("queueType")
    def serialize_queue_type(self, queue_type: QueueTypeEnum) -> str:
        """Send the queue type name expected by the shared WebSocket schema."""
        return queue_type.name

    @field_validator("queueType", mode="before")
    def convert_string_to_enum(cls, v: str) -> QueueTypeEnum:
        if isinstance(v, QueueTypeEnum):
            return v
        return QueueTypeEnum[v]
