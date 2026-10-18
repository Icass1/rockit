from dataclasses import dataclass
from typing import List


@dataclass
class Lyrics:
    text: str


@dataclass
class DynamicLyrics(Lyrics):
    timestamp_s: float


@dataclass
class LyricsData:
    public_id: str
    lines: List[Lyrics]


@dataclass
class DynamicLyricsData:
    lines: List[DynamicLyrics]
    public_id: str = ""
    offset: float = 0.0
