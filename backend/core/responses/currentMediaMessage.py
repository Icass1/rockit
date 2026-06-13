from pydantic import field_validator
from typing import Literal

from backend.core.baseModel import BaseModel
from backend.core.enums.queueTypeEnum import QueueTypeEnum


class CurrentMediaMessage(BaseModel):
    type: Literal["current_media"] = "current_media"
    mediaPublicId: str
    queueMediaId: int
    queueType: QueueTypeEnum

    @field_validator("queueType", mode="before")
    def convert_string_to_enum(cls, v: str) -> QueueTypeEnum:
        return QueueTypeEnum[v]
