from datetime import datetime
from typing import Literal

from backend.core.baseModel import BaseModel


class UserStatsRequest(BaseModel):
    range: Literal["7d", "30d", "1y", "custom"] = "7d"
    start: datetime | None = None
    end: datetime | None = None
