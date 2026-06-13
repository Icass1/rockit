from pydantic import field_validator

from backend.core.baseModel import BaseModel
from backend.core.enums.queueTypeEnum import QueueTypeEnum
from backend.core.enums.skipDirectionEnum import SkipDirectionEnum
from backend.core.models.queueItem import QueueItem


class MediaEndedMessageRequest(BaseModel):
    mediaPublicId: str


class CurrentMediaMessageRequest(BaseModel):
    mediaPublicId: str
    queueMediaId: int
    queueType: QueueTypeEnum

    @field_validator("queueType", mode="before")
    def convert_string_to_enum(cls, v: str) -> QueueTypeEnum:
        return QueueTypeEnum[v]


class CurrentQueueMessageRequestItem(QueueItem):
    pass


class CurrentQueueMessageRequest(BaseModel):
    queue: list[CurrentQueueMessageRequestItem]


class CurrentTimeMessageRequest(BaseModel):
    currentTimeMs: int
    mediaPublicId: str


class QueueTypeRequest(BaseModel):
    queueType: QueueTypeEnum

    @field_validator("queueType", mode="before")
    def convert_string_to_enum(cls, v: str) -> QueueTypeEnum:
        return QueueTypeEnum[v]


class MediaClickedMessageRequest(BaseModel):
    mediaPublicId: str


class SkipClickedMessageRequest(BaseModel):
    direction: SkipDirectionEnum
    mediaPublicId: str

    @field_validator("direction", mode="before")
    def convert_string_to_enum(cls, v: str) -> SkipDirectionEnum:
        return SkipDirectionEnum[v]


class SeekMessageRequest(BaseModel):
    mediaPublicId: str
    timeFrom: float
    timeTo: float


class MediaExpandedMessageRequest(BaseModel):
    mediaPublicId: str
    playlistPublicId: str
    expanded: bool
