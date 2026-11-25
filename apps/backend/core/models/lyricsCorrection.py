"""Validated correction proposals; provider originals are never overwritten."""

import math
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from core.models.lyrics import LyricsWord


class LyricsCorrectionLine(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str
    timestamp_s: float | None = None
    words: list[LyricsWord] | None = Field(default=None, max_length=2000)
    end_timestamp_s: float | None = Field(default=None, ge=0, le=86400, allow_inf_nan=False)


class LyricsCorrection(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: Literal["lyrics_correction"] = "lyrics_correction"
    provider: str = Field(min_length=1, max_length=100)
    revision: str = Field(pattern=r"^[a-f0-9]{64}$")
    offset: float = Field(ge=-120, le=120, allow_inf_nan=False)
    lines: list[LyricsCorrectionLine] | None = Field(default=None, min_length=1, max_length=1000)

    @model_validator(mode="after")
    def validate_times(self) -> "LyricsCorrection":
        if self.lines is not None:
            times = [line.timestamp_s for line in self.lines if line.timestamp_s is not None]
            if any(len(line.text) > 2000 for line in self.lines):
                raise ValueError("Lyrics lines are limited to 2000 characters")
            if any(not math.isfinite(time) or time < 0 or time > 86400 for time in times):
                raise ValueError("Lyrics times must be finite and between 0 and 86400 seconds")
            if times and len(times) != len(self.lines):
                raise ValueError("Use either plain lines or timestamps for every line")
            if times != sorted(times):
                raise ValueError("Lyrics timestamps must be ordered")
            if not any(line.text.strip() for line in self.lines):
                raise ValueError("Lyrics cannot be empty")
            for line in self.lines:
                start, end = line.timestamp_s, line.end_timestamp_s
                if end is not None and (start is None or end < start):
                    raise ValueError("Line end must follow its start")
                if not line.words:
                    continue
                if "".join(word.text for word in line.words) != line.text:
                    raise ValueError("Words must reconstruct the line")
                starts = [word.timestamp_s for word in line.words]
                if start is None or starts[0] < start or starts != sorted(starts):
                    raise ValueError("Word starts must be ordered within the line")
                if end is not None and any(
                    (word.end_timestamp_s if word.end_timestamp_s is not None else word.timestamp_s)
                    > end
                    for word in line.words
                ):
                    raise ValueError("Words fall outside the line")
        return self


class StoredLyricsCorrection(LyricsCorrection):
    sourceHash: str
    audioIdentity: str
