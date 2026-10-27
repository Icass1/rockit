from typing import Literal

from pydantic import BaseModel


class CurrentTimeMessage(BaseModel):
    type: Literal["current_time"] = "current_time"
    mediaPublicId: str
    queueMediaId: int
    playbackId: str
    isSeek: bool = False
    currentTimeMs: int
