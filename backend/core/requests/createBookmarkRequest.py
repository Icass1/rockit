from pydantic import BaseModel, validator

from backend.core.enums.bookmarkModeEnum import BookmarkModeEnum


class CreateBookmarkRequest(BaseModel):
    mediaPublicId: str
    timestamp: float
    description: str | None = None
    mode: BookmarkModeEnum = BookmarkModeEnum.NOTHING

    # Accept string enum names (e.g., "NOTHING", "AUTOSKIP")
    @validator("mode", pre=True)
    def parse_mode(cls, v):
        if isinstance(v, str):
            return BookmarkModeEnum[v]
        return v
