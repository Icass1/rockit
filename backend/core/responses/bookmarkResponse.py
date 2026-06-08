from datetime import datetime

from pydantic import BaseModel

from backend.core.enums.bookmarkModeEnum import BookmarkModeEnum


class BookmarkResponse(BaseModel):
    publicId: str
    mediaPublicId: str
    timestamp: float
    description: str | None
    mode: str
    dateAdded: datetime
    dateUpdated: datetime

    @classmethod
    def from_row(cls, row: object) -> "BookmarkResponse":
        from backend.core.access.db.ormModels.bookmark import BookmarkRow

        assert isinstance(row, BookmarkRow)
        return cls(
            publicId=row.public_id,
            mediaPublicId=row.media.public_id,
            timestamp=row.timestamp,
            description=row.description,
            mode=BookmarkModeEnum(row.mode_key).name,
            dateAdded=row.date_added,
            dateUpdated=row.date_updated,
        )
