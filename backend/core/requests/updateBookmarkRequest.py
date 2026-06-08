from pydantic import BaseModel

from backend.core.enums.bookmarkModeEnum import BookmarkModeEnum


class UpdateBookmarkRequest(BaseModel):
    timestamp: float | None = None
    description: str | None = None
    mode: BookmarkModeEnum | None = None
