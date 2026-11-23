from pydantic import Field

from core.models.lyrics import LyricsWord
from core.models.lyricsCorrection import LyricsCorrectionLine


class PlaybackLyricsLine(LyricsCorrectionLine):
    words: list[LyricsWord] = Field(default_factory=list[LyricsWord])
    end_timestamp_s: float | None = None
