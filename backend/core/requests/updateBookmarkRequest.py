from pydantic import BaseModel, validator

from backend.core.enums.bookmarkModeEnum import BookmarkModeEnum


class UpdateBookmarkRequest(BaseModel):
    timestamp: float | None = None
    description: str | None = None
    mode: BookmarkModeEnum | None = None

    # Accept string enum names (e.g., "NOTHING", "AUTOSKIP")
    @validator("mode", pre=True)
    def parse_mode(cls, v):
        if isinstance(v, str):
            return BookmarkModeEnum[v]
        return v
