from pydantic import Field, field_validator

from backend.core.baseModel import BaseModel
from backend.core.enums.queueTypeEnum import QueueTypeEnum
from backend.core.enums.skipDirectionEnum import SkipDirectionEnum
from backend.core.models.queueItem import QueueItem


class MediaEndedMessageRequest(BaseModel):
    playbackId: str = Field(min_length=1)
    queueMediaId: int
    mediaPublicId: str


class CurrentMediaMessageRequest(BaseModel):
    currentTimeMs: int = Field(default=0, ge=0)
    playbackId: str = Field(min_length=1)
    queueMediaId: int
    mediaPublicId: str
    queueType: QueueTypeEnum

    @field_validator("queueType", mode="before")
    def convert_string_to_enum(cls, v: str) -> QueueTypeEnum:
        return QueueTypeEnum[v]


class CurrentQueueMessageRequestItem(QueueItem):
    pass


class CurrentQueueMessageRequest(BaseModel):
    queue: list[CurrentQueueMessageRequestItem]


class CurrentTimeMessageRequest(BaseModel):
    playbackId: str = Field(min_length=1)
    queueMediaId: int
    currentTimeMs: int = Field(ge=0)
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
    playbackId: str = Field(min_length=1)
    queueMediaId: int
    mediaPublicId: str
    timeFrom: float = Field(ge=0, allow_inf_nan=False)
    timeTo: float = Field(ge=0, allow_inf_nan=False)


class MediaExpandedMessageRequest(BaseModel):
    mediaPublicId: str
    playlistPublicId: str
    expanded: bool
