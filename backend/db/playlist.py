from typing import TypedDict, List, Optional
import json
from dataclasses import dataclass

from backend.db.commonTypes import OldImageDB


class RawPlaylistDB(TypedDict):
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
    addedInRockit: Optional[bool] = None


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

    raw_playlist_images = raw_playlist.get("images", "[]")

    return PlaylistDBFull(
        id=raw_playlist.get("id"),
        images=json.loads(
            s=raw_playlist_images) if raw_playlist_images else None,
        image=raw_playlist.get("image"),
        name=raw_playlist.get("name"),
        description=raw_playlist.get("description"),
        owner=raw_playlist.get("owner"),
        followers=raw_playlist.get("followers"),
        songs=[PlaylistDBSong(**args)
               for args in json.loads(raw_playlist.get("songs", "[]"))],
        updatedAt=raw_playlist.get("updatedAt"),
        createdAt=raw_playlist.get("createdAt"),
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
