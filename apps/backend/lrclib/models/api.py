from pydantic import BaseModel, Field, field_validator


class LyricsResponse(BaseModel):
    id: int
    name: str = ""
    trackName: str
    artistName: str
    albumName: str = ""
    duration: float = Field(default=0, ge=0, allow_inf_nan=False)
    instrumental: bool = False
    plainLyrics: str | None = None
    syncedLyrics: str | None = None
    lyricsfile: str | None = None

    @field_validator("name", "albumName", mode="before")
    @classmethod
    def empty_optional_text(cls, value: object) -> object:
        """Missing optional release metadata must not discard otherwise identified lyrics."""
        return "" if value is None else value
