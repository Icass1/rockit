from pydantic import BaseModel


class ContentRatingResponse(BaseModel):
    publicId: str
    explicit: bool | None
    source: str | None
    manual: bool


class ContentRatingLookupResponse(BaseModel):
    items: list[ContentRatingResponse]


class ContentRatingBackfillResponse(BaseModel):
    nextAfter: str
    hasMore: bool
    examined: int
    processed: int
