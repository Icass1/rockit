from pydantic import BaseModel

from backend.core.enums.bookmarkModeEnum import BookmarkModeEnum


class CreateBookmarkRequest(BaseModel):
    mediaPublicId: str
    timestamp: float
    description: str | None = None
    mode: BookmarkModeEnum = BookmarkModeEnum.NOTHING
