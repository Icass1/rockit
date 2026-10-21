from pydantic import BaseModel, field_validator

from backend.core.enums.bookmarkModeEnum import BookmarkModeEnum


class CreateBookmarkRequest(BaseModel):
    mediaPublicId: str
    timestamp: float
    description: str | None = None
    mode: BookmarkModeEnum = BookmarkModeEnum.NOTHING

    @field_validator("mode", mode="before")
    @classmethod
    def parse_mode(cls, v: object) -> BookmarkModeEnum:
        if isinstance(v, BookmarkModeEnum):
            return v
        if isinstance(v, str):
            return BookmarkModeEnum[v]
        raise ValueError(f"Invalid bookmark mode: {v}")
