from dataclasses import dataclass, field
from typing import Dict, List, cast


@dataclass
class ScrappedImage:
    url: str
    width: int | None = None
    height: int | None = None


@dataclass
class ScrappedArtist:
    id: str
    name: str
    genres: List[str] = field(default_factory=list[str])
    images: List[ScrappedImage] = field(default_factory=list[ScrappedImage])
    followers: int = 0
    popularity: int = 0


@dataclass
class ScrappedAlbum:
    id: str
    name: str
    artists: List[ScrappedArtist] = field(default_factory=list[ScrappedArtist])
    images: List[ScrappedImage] = field(default_factory=list[ScrappedImage])
    release_date: str = ""
    total_tracks: int = 0
    popularity: int = 0
    copyrights: List[Dict[str, str]] = field(default_factory=list[Dict[str, str]])
    tracks: List["ScrappedTrack"] = field(
        default_factory=lambda: cast(List["ScrappedTrack"], [])
    )


@dataclass
class ScrappedTrack:
    id: str
    name: str
    artists: List[ScrappedArtist] = field(default_factory=list[ScrappedArtist])
    album: ScrappedAlbum | None = None
    duration_ms: int = 0
    track_number: int = 0
    disc_number: int = 1
    popularity: int = 0
    isrc: str = ""
    preview_url: str | None = None


@dataclass
class ScrappedPlaylist:
    id: str
    name: str
    description: str = ""
    images: List[ScrappedImage] = field(default_factory=list[ScrappedImage])
    owner: str = ""
    tracks: List["ScrappedPlaylistItem"] = field(
        default_factory=lambda: cast(List["ScrappedPlaylistItem"], [])
    )


@dataclass
class ScrappedPlaylistItem:
    track: ScrappedTrack | None = None
    added_at: str = ""
    added_by: str = ""


@dataclass
class ScrappedSearchResults:
    tracks: List[ScrappedTrack] = field(default_factory=list[ScrappedTrack])
    albums: List[ScrappedAlbum] = field(default_factory=list[ScrappedAlbum])
    artists: List[ScrappedArtist] = field(default_factory=list[ScrappedArtist])
    playlists: List[ScrappedPlaylist] = field(default_factory=list[ScrappedPlaylist])
