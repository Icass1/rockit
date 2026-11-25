from pydantic import BaseModel, ConfigDict, Field

from core.models.lyrics import LyricsWord


class PlaybackLyricsLine(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str
    timestamp_s: float | None = None
    words: list[LyricsWord] = Field(default_factory=list[LyricsWord])
    end_timestamp_s: float | None = None
