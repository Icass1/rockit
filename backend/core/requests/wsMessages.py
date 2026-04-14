from pydantic import BaseModel, field_validator

from backend.core.enums.queueTypeEnum import QueueTypeEnum
from backend.core.enums.skipDirectionEnum import SkipDirectionEnum


class MediaEndedMessageRequest(BaseModel):
    mediaPublicId: str


class CurrentMediaMessageRequest(BaseModel):
    mediaPublicId: str
    queueMediaId: int


class CurrentQueueMessageRequestItem(BaseModel):
    publicId: str
    queueMediaId: int


class CurrentQueueMessageRequest(BaseModel):
    queue: list[CurrentQueueMessageRequestItem]
    queueType: QueueTypeEnum

    @field_validator("queueType", mode="before")
    def convert_string_to_enum(cls, v: str) -> QueueTypeEnum:
        return QueueTypeEnum[v]


class CurrentTimeMessageRequest(BaseModel):
    currentTimeMs: int
    mediaPublicId: str


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
