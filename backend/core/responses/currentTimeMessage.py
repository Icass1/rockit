from pydantic import BaseModel
from typing import Literal


class CurrentTimeMessage(BaseModel):
    type: Literal["current_time"] = "current_time"
    mediaPublicId: str
    queueMediaId: int
    playbackId: str
    isSeek: bool = False
    currentTimeMs: int
