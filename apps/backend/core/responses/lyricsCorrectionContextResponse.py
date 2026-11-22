from typing import Literal

from pydantic import BaseModel

from core.models.playbackLyricsLine import PlaybackLyricsLine


class LyricsCorrectionContextResponse(BaseModel):
    provider: str
    publicId: str
    revision: str | None
    offset: float
    lines: list[PlaybackLyricsLine]
    syncStatus: Literal["provider", "approved", "pending"]
