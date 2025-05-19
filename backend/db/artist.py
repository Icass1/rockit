from typing import TypedDict, List, Optional
import json
from dataclasses import dataclass

from backend.db.commonTypes import OldImageDB


class RawArtistDB(TypedDict):
    id: str
    images: str
    image: str
    name: str
    genres: str
    followers: int
    popularity: int
    type: str
    dateAdded: str


@dataclass
class ArtistDBFull:
    id: str
    images: List[OldImageDB]
    image: str
    name: str
    genres: List[str]
    followers: int
    popularity: int
    type: str
    dateAdded: str


def parse_artist(raw_artist: Optional[RawArtistDB]) -> Optional[ArtistDBFull]:
    if not raw_artist:
        return None

    return ArtistDBFull(
        id=raw_artist.get("id"),
        images=json.loads(raw_artist.get("images", "[]")),
        image=raw_artist.get("image"),
        name=raw_artist.get("name"),
        genres=json.loads(raw_artist.get("genres", "[]")),
        followers=raw_artist.get("followers"),
        popularity=raw_artist.get("popularity"),
        type=raw_artist.get("type"),
        dateAdded=raw_artist.get("dateAdded"),
    )


artist_query = """
CREATE TABLE IF NOT EXISTS artist (
    id TEXT NOT NULL PRIMARY KEY UNIQUE,
    images TEXT NOT NULL,
    image TEXT,
    name TEXT NOT NULL,
    genres TEXT NOT NULL,
    followers INTEGER NOT NULL,
    popularity INTEGER NOT NULL,
    type TEXT NOT NULL,
    dateAdded TEXT NOT NULL
)"""
