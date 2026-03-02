from pydantic import BaseModel, field_validator

from backend.core.enums.queueTypeEnum import QueueTypeEnum


class MediaEndedMessageRequest(BaseModel):
    mediaPublicId: str


class CurrentMediaMessageRequest(BaseModel):
    mediaPublicId: str
    queueIndex: int


class CurrentQueueMessageRequestItem(BaseModel):
    publicId: str
    queueIndex: int


class CurrentQueueMessageRequest(BaseModel):
    queue: list[CurrentQueueMessageRequestItem]
    queueType: QueueTypeEnum

    @field_validator("queueType", mode="before")
    def convert_string_to_enum(cls, v: str):
        return QueueTypeEnum[v]


class CurrentTimeMessageRequest(BaseModel):
    currentTime: float


class MediaClickedMessageRequest(BaseModel):
    mediaPublicId: str


class SkipClickedMessageRequest(BaseModel):
    direction: str
    mediaPublicId: str


class SeekMessageRequest(BaseModel):
    timeFrom: float
    timeTo: float
