from pydantic import BaseModel, field_serializer

from backend.core.enums.queueTypeEnum import QueueTypeEnum


class SessionResponse(BaseModel):
    username: str
    image: str
    admin: bool
    queueType: QueueTypeEnum
    currentTime: float | None

    @field_serializer("queueType")
    def serialize_queue_type(self, queue_type: QueueTypeEnum) -> str:
        return queue_type.name
