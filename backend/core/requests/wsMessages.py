from pydantic import BaseModel, field_validator

from backend.core.enums.queueTypeEnum import QueueTypeEnum
from backend.core.enums.skipDirectionEnum import SkipDirectionEnum


class MediaEndedMessageRequest(BaseModel):
    mediaPublicId: str


class CurrentMediaMessageRequest(BaseModel):
    mediaPublicId: str
    queueMediaId: int
    queueType: QueueTypeEnum

    @field_validator("queueType", mode="before")
    def convert_string_to_enum(cls, v: str) -> QueueTypeEnum:
        return QueueTypeEnum[v]


class CurrentQueueMessageRequestItem(BaseModel):
    mediaPublicId: str
    listPublicId: str
    queueMediaId: int
    queueType: QueueTypeEnum

    @field_validator("queueType", mode="before")
    def convert_string_to_enum(cls, v: str) -> QueueTypeEnum:
        return QueueTypeEnum[v]


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
