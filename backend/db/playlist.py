from typing import TypedDict, List, Optional
import json
from dataclasses import dataclass

from db.commonTypes import OldImageDB


@dataclass
class RawPlaylistDB:
    id: str
    images: Optional[str]
    image: str
    name: str
    description: str
    owner: str
    followers: int
    songs: str
    updatedAt: Optional[str]
    createdAt: Optional[str]


@dataclass
class PlaylistDBSong:
    id: str
    added_at: Optional[str]
    addedInRockit: Optional[bool]


@dataclass
class PlaylistDBFull:
    id: str
    images: Optional[List[OldImageDB]]
    image: str
    name: str
    description: str
    owner: str
    followers: int
    songs: List[PlaylistDBSong]
    updatedAt: Optional[str]
    createdAt: Optional[str]


def parse_playlist(raw_playlist: Optional[RawPlaylistDB]) -> Optional[PlaylistDBFull]:
    if not raw_playlist:
        return None

    return PlaylistDBFull(
        id=raw_playlist.id,
        images=json.loads(
            s=raw_playlist.images) if raw_playlist.images else None,
        image=raw_playlist.image,
        name=raw_playlist.name,
        description=raw_playlist.description,
        owner=raw_playlist.owner,
        followers=raw_playlist.followers,
        songs=json.loads(raw_playlist.songs),
        updatedAt=raw_playlist.updatedAt,
        createdAt=raw_playlist.createdAt,
    )


playlist_query = """
CREATE TABLE IF NOT EXISTS playlist (
    id TEXT NOT NULL PRIMARY KEY UNIQUE,
    images TEXT,
    image TEXT NOT NULL DEFAULT "",
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    owner TEXT NOT NULL,
    followers INTEGER NOT NULL,
    songs TEXT NOT NULL,
    updatedAt TEXT,
    createdAt TEXT
)
"""
