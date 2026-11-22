from pydantic import BaseModel, Field

from core.models.lyrics import LyricsWord


class LyricsItem(BaseModel):
    text: str


class DynamicLyricsItem(LyricsItem):
    timestamp_s: float
    words: list[LyricsWord] = Field(default_factory=list[LyricsWord])
    end_timestamp_s: float | None = None


class GetLyricsResponse(BaseModel):
    lyrics: list[LyricsItem] | None
    dynamicLyrics: list[DynamicLyricsItem] | None


class GetLyricsBatchResponse(BaseModel):
    lyrics: dict[str, GetLyricsResponse]
