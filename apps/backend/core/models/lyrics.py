from dataclasses import dataclass


@dataclass
class Lyrics:
    text: str


@dataclass
class DynamicLyrics(Lyrics):
    timestamp_s: float


@dataclass
class LyricsData:
    public_id: str
    lines: list[Lyrics]


@dataclass
class DynamicLyricsData:
    lines: list[DynamicLyrics]
    public_id: str = ""
    offset: float = 0.0
