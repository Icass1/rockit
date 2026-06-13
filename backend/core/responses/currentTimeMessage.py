from pydantic import BaseModel
from typing import Literal


class CurrentTimeMessage(BaseModel):
    type: Literal["current_time"] = "current_time"
    currentTimeMs: int
