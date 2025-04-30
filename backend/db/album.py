from typing import TypedDict, List, Optional
import json
from dataclasses import dataclass

from db.commonTypes import ArtistDB, OldImageDB


@dataclass
class AlbumDBCopyright:
    text: str
    type: str


class RawAlbumDB(TypedDict):
    id: str
    type: str
    images: str
    image: str
    name: str
    releaseDate: str
    artists: str
    copyrights: str
    popularity: int
    genres: str
    songs: str
    discCount: int
    dateAdded: Optional[int]


@dataclass
class AlbumDBFull:
    id: str
    type: str
    images: List[OldImageDB]
    image: str
    name: str
    releaseDate: str
    artists: List[ArtistDB]
    copyrights: List[AlbumDBCopyright]
    popularity: int
    genres: List[str]
    songs: List[str]
    discCount: int
    dateAdded: Optional[int]


def parse_album(raw_album: Optional[RawAlbumDB]) -> Optional[AlbumDBFull]:
    if not raw_album:
        return None

    return AlbumDBFull(
        id=raw_album.get("id"),
        type=raw_album.get("type"),
        images=json.loads(raw_album.get("images", "[]")),
        image=raw_album.get("image"),
        name=raw_album.get("name"),
        releaseDate=raw_album.get("releaseDate"),
        artists=json.loads(raw_album.get("artists", "[]")),
        copyrights=json.loads(raw_album.get("copyrights", "[]")),
        popularity=raw_album.get("popularity"),
        genres=json.loads(raw_album.get("genres", "[]")),
        songs=json.loads(raw_album.get("songs", "[]")),
        discCount=raw_album.get("discCount"),
        dateAdded=raw_album.get("dateAdded"),
    )

    return AlbumDBFull(
        id=raw_album.id,
        type=raw_album.type,
        images=json.loads(raw_album.images),
        image=raw_album.image,
        name=raw_album.name,
        releaseDate=raw_album.releaseDate,
        artists=json.loads(raw_album.artists),
        copyrights=json.loads(raw_album.copyrights),
        popularity=raw_album.popularity,
        genres=json.loads(raw_album.genres),
        songs=json.loads(raw_album.songs),
        discCount=raw_album.discCount,
        dateAdded=raw_album.dateAdded,
    )


album_query = """
CREATE TABLE IF NOT EXISTS album (
    id TEXT NOT NULL PRIMARY KEY UNIQUE,
    type TEXT NOT NULL,
    images TEXT NOT NULL,
    image TEXT NOT NULL DEFAULT "",
    name TEXT NOT NULL,
    releaseDate TEXT NOT NULL,
    artists TEXT NOT NULL,
    copyrights TEXT NOT NULL,
    popularity INTEGER NOT NULL,
    genres TEXT NOT NULL,
    songs TEXT NOT NULL,
    discCount INTEGER NOT NULL,
    dateAdded INTEGER
)"""
