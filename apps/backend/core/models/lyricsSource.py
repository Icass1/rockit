"""A source suggestion and its server-resolved, reviewable snapshot."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from core.models.lyricsCorrection import LyricsCorrection, LyricsCorrectionLine


class LyricsSource(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: Literal["lyrics_source"]
    provider: Literal["LRCLIB"]
    sourceId: int = Field(strict=True, gt=0, le=9007199254740991)


class StoredLyricsSource(LyricsSource):
    trackName: str = Field(max_length=2000)
    artistName: str = Field(max_length=2000)
    albumName: str = Field(default="", max_length=2000)
    duration: float = Field(ge=0, allow_inf_nan=False)
    offset: float = Field(default=0, ge=-120, le=120, allow_inf_nan=False)
    lines: list[LyricsCorrectionLine] = Field(min_length=1, max_length=1000)

    @model_validator(mode="after")
    def validate_lines(self) -> "StoredLyricsSource":
        LyricsCorrection(
            provider=self.provider, revision="0" * 64, offset=self.offset, lines=self.lines
        )
        return self
