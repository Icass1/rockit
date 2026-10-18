from datetime import datetime

from pydantic import BaseModel, field_serializer

from backend.core.enums.bookmarkModeEnum import BookmarkModeEnum


class BookmarkResponse(BaseModel):
    publicId: str
    mediaPublicId: str
    timestamp: float
    description: str | None
    mode: BookmarkModeEnum
    dateAdded: datetime
    dateUpdated: datetime

    @field_serializer("mode")
    def serialize_repeat_mode(self, status: BookmarkModeEnum) -> str:
        return status.name
