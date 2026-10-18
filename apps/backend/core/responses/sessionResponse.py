from pydantic import BaseModel, field_serializer

from backend.core.enums.queueTypeEnum import QueueTypeEnum
from backend.core.enums.repeatModeEnum import RepeatModeEnum


class SessionResponse(BaseModel):
    username: str
    image: str
    admin: bool
    queueType: QueueTypeEnum
    repeatMode: RepeatModeEnum
    currentTimeMs: int | None

    @field_serializer("queueType")
    def serialize_queue_type(self, queue_type: QueueTypeEnum) -> str:
        return queue_type.name

    @field_serializer("repeatMode")
    def serialize_repeat_mode(self, repeat_mode: RepeatModeEnum) -> str:
        return repeat_mode.name
