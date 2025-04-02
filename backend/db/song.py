# ****************************************
# ************** Song stuff **************
# ****************************************

from typing import TypedDict, List, Optional
import json

class OldImageDB(TypedDict):
    url: str
    width: int
    height: int

class ArtistDB(TypedDict):
    name: str
    id: str

class DynamicLyrics(TypedDict):
    lyrics: str
    seconds: int

class RawSongDB(TypedDict):
    id: str
    name: str
    artists: str
    genres: str
    discNumber: Optional[int]
    albumName: str
    albumArtist: str
    albumType: str
    albumId: str
    duration: int
    date: str
    trackNumber: Optional[int]
    publisher: Optional[str]
    path: Optional[str]
    images: str
    image: str
    copyright: Optional[str]
    downloadUrl: Optional[str]
    lyrics: Optional[str]
    dynamicLyrics: Optional[str]
    popularity: Optional[int]
    dateAdded: Optional[str]

class SongDBFull(TypedDict):
    id: str
    name: str
    artists: List[ArtistDB]
    genres: List[str]
    discNumber: Optional[int]
    albumName: str
    albumArtist: List[ArtistDB]
    albumType: str
    albumId: str
    duration: int
    date: str
    trackNumber: Optional[int]
    publisher: Optional[str]
    path: Optional[str]
    images: List[OldImageDB]
    image: Optional[str]
    copyright: Optional[str]
    downloadUrl: Optional[str]
    lyrics: Optional[str]
    dynamicLyrics: List[DynamicLyrics]
    popularity: Optional[int]
    dateAdded: Optional[str]

def parse_song(raw_song: Optional[RawSongDB]) -> Optional[SongDBFull]:
    if not raw_song:
        return None    

    dynamic_lyrics = raw_song.get("dynamicLyrics", "[]")

    return SongDBFull(
        id=raw_song.get("id", None),
        name=raw_song.get("name"),
        artists=json.loads(raw_song.get("artists", "[]")),
        genres=json.loads(raw_song.get("genres", "[]")),
        discNumber=raw_song.get("discNumber"),
        albumName=raw_song.get("albumName"),
        albumArtist=json.loads(raw_song.get("albumArtist", "[]")),
        albumType=raw_song.get("albumType"),
        albumId=raw_song.get("albumId"),
        duration=raw_song.get("duration"),
        date=raw_song.get("date"),
        trackNumber=raw_song.get("trackNumber"),
        publisher=raw_song.get("publisher"),
        path=raw_song.get("path"),
        images=json.loads(raw_song.get("images", "[]")),
        image=raw_song.get("image"),
        copyright=raw_song.get("copyright"),
        downloadUrl=raw_song.get("downloadUrl"),
        lyrics=raw_song.get("lyrics"),
        dynamicLyrics=json.loads(dynamic_lyrics) if dynamic_lyrics else [],
        popularity=raw_song.get("popularity"),
        dateAdded=raw_song.get("dateAdded"),
    )

song_query = """
CREATE TABLE IF NOT EXISTS song (
    id TEXT NOT NULL PRIMARY KEY UNIQUE,
    name TEXT NOT NULL,
    artists TEXT NOT NULL,
    genres TEXT NOT NULL,
    discNumber INTEGER,
    albumName TEXT NOT NULL,
    albumArtist TEXT NOT NULL,
    albumType TEXT NOT NULL,
    albumId TEXT NOT NULL,
    duration INTEGER NOT NULL,
    date TEXT NOT NULL,
    trackNumber INTEGER,
    publisher TEXT,
    path TEXT,
    images TEXT NOT NULL,
    image TEXT NOT NULL DEFAULT "",
    copyright TEXT,
    downloadUrl TEXT,
    lyrics TEXT,
    dynamicLyrics TEXT,
    popularity INTEGER,
    dateAdded TEXT
)"""
