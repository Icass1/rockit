import re
from functools import cached_property

from pydantic import BaseModel, Field, field_validator

from core.models.lyrics import DynamicLyrics, Lyrics
from lrclib.framework.lyricsfile import parse_lyricsfile


class LyricsResponse(BaseModel):
    id: int
    name: str = ""
    trackName: str
    artistName: str
    albumName: str = ""
    duration: float = Field(default=0, ge=0, allow_inf_nan=False)
    instrumental: bool = False
    hasWordSync: bool = False
    plainLyrics: str | None = None
    syncedLyrics: str | None = None
    lyricsfile: str | None = None

    @field_validator("name", "albumName", mode="before")
    @classmethod
    def empty_optional_text(cls, value: object) -> object:
        """Missing optional release metadata must not discard otherwise identified lyrics."""
        return "" if value is None else value

    @cached_property
    def file_lyrics(self) -> tuple[list[Lyrics] | None, list[DynamicLyrics]]:
        return parse_lyricsfile(raw=self.lyricsfile)

    @property
    def quality(self) -> int:
        plain, lines = self.file_lyrics
        if any(line.words for line in lines):
            return 3
        legacy_synced = any(
            re.match(r"^\[\d+:[0-5]\d(?:\.\d+)?\]", line)
            and re.sub(r"\[\d+:[0-5]\d(?:\.\d+)?\]", "", line).strip()
            for line in (self.syncedLyrics or "").splitlines()
        )
        if lines or legacy_synced:
            return 2
        return int(bool(plain or (self.plainLyrics or "").strip()))
