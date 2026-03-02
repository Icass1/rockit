from pydantic import BaseModel


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
