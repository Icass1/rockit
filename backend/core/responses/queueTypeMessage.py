from pydantic import field_validator
from typing import Literal

from backend.core.baseModel import BaseModel
from backend.core.enums.queueTypeEnum import QueueTypeEnum


class QueueTypeMessage(BaseModel):
    type: Literal["queue_type"] = "queue_type"
    queueType: QueueTypeEnum

    @field_validator("queueType", mode="before")
    def convert_string_to_enum(cls, v: str) -> QueueTypeEnum:
        return QueueTypeEnum[v]
