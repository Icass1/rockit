from typing import Self

from pydantic import Field, model_validator

from core.baseModel import BaseModel


class QueueItem(BaseModel):
    mediaPublicId: str
    listPublicId: str | None = None
    queueMediaId: int
    randomIndex: int
    sortedIndex: int
    startTimeMs: int | None = Field(default=None, ge=0, le=2_147_483_647)
    endTimeMs: int | None = Field(default=None, gt=0, le=2_147_483_647)

    @model_validator(mode="after")
    def validate_time_bounds(self) -> Self:
        if self.endTimeMs is not None and self.endTimeMs <= (self.startTimeMs or 0):
            raise ValueError("Queue end time must be after start time")
        return self
