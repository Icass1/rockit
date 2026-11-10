from datetime import datetime
from typing import Literal

from core.baseModel import BaseModel


class UserStatsV2Request(BaseModel):
    range: Literal["today", "7d", "30d", "1y", "all", "custom"] = "7d"
    start: datetime | None = None
    end: datetime | None = None
    timezoneOffsetMinutes: int = 0
