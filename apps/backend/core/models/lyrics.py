from dataclasses import dataclass, field

from pydantic import BaseModel, Field, model_validator


class LyricsWord(BaseModel):
    text: str
    timestamp_s: float = Field(ge=0, le=86400, allow_inf_nan=False)
    end_timestamp_s: float | None = Field(default=None, ge=0, le=86400, allow_inf_nan=False)

    @model_validator(mode="after")
    def validate_end(self) -> "LyricsWord":
        if self.end_timestamp_s is not None and self.end_timestamp_s < self.timestamp_s:
            raise ValueError("Word end must follow its start")
        return self


@dataclass
class Lyrics:
    text: str


@dataclass
class DynamicLyrics(Lyrics):
    timestamp_s: float
    words: list[LyricsWord] = field(default_factory=list[LyricsWord])
    end_timestamp_s: float | None = None


@dataclass
class LyricsData:
    public_id: str
    lines: list[Lyrics]


@dataclass
class DynamicLyricsData:
    lines: list[DynamicLyrics]
    public_id: str = ""
    offset: float = 0.0
