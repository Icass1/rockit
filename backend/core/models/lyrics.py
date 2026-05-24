from dataclasses import dataclass


@dataclass
class Lyrics:
    text: str


@dataclass
class DynamicLyrics(Lyrics):
    timestamp_s: float
