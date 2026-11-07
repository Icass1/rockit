from typing import Literal

from pydantic import BaseModel

from core.models.lyricsCorrection import LyricsCorrectionLine


class LyricsCorrectionContextResponse(BaseModel):
    provider: str
    publicId: str
    revision: str | None
    offset: float
    lines: list[LyricsCorrectionLine]
    syncStatus: Literal["provider", "approved"]
