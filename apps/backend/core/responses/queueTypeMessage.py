from typing import Literal

from pydantic import field_serializer

from core.baseModel import BaseModel
from core.enums.queueTypeEnum import QueueTypeEnum


class QueueTypeMessage(BaseModel):
    type: Literal["queue_type"] = "queue_type"
    queueType: QueueTypeEnum

    @field_serializer("queueType")
    def serialize_queue_type(self, queue_type: QueueTypeEnum) -> str:
        return queue_type.name
