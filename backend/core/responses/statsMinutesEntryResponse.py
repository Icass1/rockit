from datetime import datetime
from pydantic import Field

from backend.core.baseModel import BaseModel


class StatsMinutesEntryResponse(BaseModel):
    minutes: float
    start: datetime
    end: datetime
    label: str = Field(
        default="", description="Label for the bar chart, e.g., 'Mon', 'W1', 'Jan'"
    )
