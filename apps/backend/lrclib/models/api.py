from pydantic import BaseModel


class LyricsResponse(BaseModel):

    id: int
    name: str
    trackName: str
    artistName: str
    albumName: str
    duration: float
    instrumental: bool
    plainLyrics: str | None
    syncedLyrics: str | None
    lyricsfile: str | None
