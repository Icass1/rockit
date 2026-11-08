from typing import Literal

from pydantic import BaseModel, Field


class UpdateContentRatingRequest(BaseModel):
    value: Literal["explicit", "clean", "unknown"]


class ContentRatingLookupRequest(BaseModel):
    publicIds: list[str] = Field(min_length=1, max_length=100)


class ContentRatingBackfillRequest(BaseModel):
    after: str = Field(default="", max_length=64)
    limit: int = Field(default=25, ge=1, le=100)
