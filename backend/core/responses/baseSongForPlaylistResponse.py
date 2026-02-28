from datetime import datetime

from pydantic import BaseModel, field_validator

from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse


class BaseSongForPlaylistResponse(BaseModel):
    song: BaseSongWithAlbumResponse
    addedAt: datetime

    @field_validator("addedAt")
    def validate_timezone(cls, v: datetime):
        if v.tzinfo is None:
            raise ValueError(
                "addedAt must be a timezone-aware datetime (e.g., UTC +00:00)."
            )
        return v
