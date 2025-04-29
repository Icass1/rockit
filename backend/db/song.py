# ****************************************
# ************** Song stuff **************
# ****************************************

from typing import TypedDict, List, Optional
import json
from dataclasses import dataclass

from db.commonTypes import ArtistDB, OldImageDB


@dataclass
class DynamicLyrics:
    lyrics: str
    seconds: int


@dataclass
class RawSongDB:
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


@dataclass
class SongDBFull:
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

    dynamic_lyrics = raw_song.dynamicLyrics

    return SongDBFull(
        id=raw_song.id,
        name=raw_song.name,
        artists=json.loads(raw_song.artists),
        genres=json.loads(raw_song.genres),
        discNumber=raw_song.discNumber,
        albumName=raw_song.albumName,
        albumArtist=json.loads(raw_song.albumArtist),
        albumType=raw_song.albumType,
        albumId=raw_song.albumId,
        duration=raw_song.duration,
        date=raw_song.date,
        trackNumber=raw_song.trackNumber,
        publisher=raw_song.publisher,
        path=raw_song.path,
        images=json.loads(raw_song.images),
        image=raw_song.image,
        copyright=raw_song.copyright,
        downloadUrl=raw_song.downloadUrl,
        lyrics=raw_song.lyrics,
        dynamicLyrics=json.loads(dynamic_lyrics) if dynamic_lyrics else [],
        popularity=raw_song.popularity,
        dateAdded=raw_song.dateAdded,
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
