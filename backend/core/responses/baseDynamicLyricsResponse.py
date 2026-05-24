from pydantic import BaseModel


class BaseDynamicLyricsItem(BaseModel):
    text: str
    timestamp_s: float


class BaseDynamicLyricsResponse(BaseModel):
    provider: str
    publicId: str
    offset: float
    lines: list[BaseDynamicLyricsItem]
