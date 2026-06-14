from pydantic import BaseModel, field_validator

from backend.core.enums.bookmarkModeEnum import BookmarkModeEnum


class UpdateBookmarkRequest(BaseModel):
    timestamp: float | None = None
    description: str | None = None
    mode: BookmarkModeEnum | None = None

    @field_validator("mode", mode="before")
    @classmethod
    def parse_mode(cls, v: object) -> BookmarkModeEnum | None:
        if v is None:
            return None
        if isinstance(v, BookmarkModeEnum):
            return v
        if isinstance(v, str):
            return BookmarkModeEnum[v]
        raise ValueError(f"Invalid bookmark mode: {v}")
