from pydantic import BaseModel


class LyricsItem(BaseModel):
    text: str


class DynamicLyricsItem(LyricsItem):
    timestamp_s: float


class GetLyricsResponse(BaseModel):
    lyrics: list[LyricsItem] | None
    dynamicLyrics: list[DynamicLyricsItem] | None


class GetLyricsBatchResponse(BaseModel):
    lyrics: dict[str, GetLyricsResponse]
