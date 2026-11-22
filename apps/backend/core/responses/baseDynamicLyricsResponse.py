from pydantic import BaseModel, Field

from core.models.lyrics import LyricsWord


class BaseDynamicLyricsItem(BaseModel):
    text: str
    timestamp_s: float
    words: list[LyricsWord] = Field(default_factory=list[LyricsWord])
    end_timestamp_s: float | None = None


class BaseDynamicLyricsResponse(BaseModel):
    provider: str
    publicId: str
    offset: float
    lines: list[BaseDynamicLyricsItem]
