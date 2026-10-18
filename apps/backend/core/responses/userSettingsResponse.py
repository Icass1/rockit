from pydantic import BaseModel, field_serializer

from backend.core.enums.queueTypeEnum import QueueTypeEnum
from backend.core.enums.repeatModeEnum import RepeatModeEnum


class UserSettingsResponse(BaseModel):
    username: str
    lang: str
    crossfade: int
    queueType: QueueTypeEnum
    repeatMode: RepeatModeEnum

    @field_serializer("queueType")
    def serialize_queue_type(self, queue_type: QueueTypeEnum) -> str:
        return queue_type.name

    @field_serializer("repeatMode")
    def serialize_repeat_mode(
        self,
        repeat_mode: RepeatModeEnum,
    ) -> str:
        return repeat_mode.name
