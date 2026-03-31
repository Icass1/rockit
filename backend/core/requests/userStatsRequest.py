from typing import Literal
from pydantic import BaseModel


class UserStatsRequest(BaseModel):
    range: Literal["7d", "30d", "1y", "custom"] = "7d"
    start: str | None = None
    end: str | None = None
