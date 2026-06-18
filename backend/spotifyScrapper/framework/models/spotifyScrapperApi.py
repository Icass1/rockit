from dataclasses import dataclass, field
from typing import Any, Dict, List, cast


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


# ── Parse functions ──────────────────────────────────────────────────────────


def parse_image(raw: Dict[str, Any]) -> ScrappedImage:
    raw_url: str = cast(str, raw.get("url", ""))
    raw_width: Any = raw.get("width")
    raw_height: Any = raw.get("height")
    return ScrappedImage(url=raw_url, width=raw_width, height=raw_height)


def parse_artist(raw: Dict[str, Any]) -> ScrappedArtist:
    raw_images: List[Dict[str, Any]] = cast(
        List[Dict[str, Any]], raw.get("images", []) or []
    )
    raw_genres: List[str] = cast(List[str], raw.get("genres", []) or [])
    raw_followers: Dict[str, Any] = cast(Dict[str, Any], raw.get("followers", {}) or {})
    raw_popularity: int = cast(int, raw.get("popularity", 0) or 0)
    return ScrappedArtist(
        id=cast(str, raw.get("id", "")),
        name=cast(str, raw.get("name", "")),
        genres=raw_genres,
        images=[parse_image(i) for i in raw_images],
        followers=cast(int, raw_followers.get("total", 0) or 0),
        popularity=raw_popularity,
    )


def parse_track(raw: Dict[str, Any]) -> ScrappedTrack:
    raw_artists: List[Dict[str, Any]] = cast(
        List[Dict[str, Any]], raw.get("artists", []) or []
    )
    raw_album: Dict[str, Any] | None = cast(Dict[str, Any] | None, raw.get("album"))
    album: ScrappedAlbum | None = None
    if raw_album is not None:
        raw_album_artists: List[Dict[str, Any]] = cast(
            List[Dict[str, Any]], raw_album.get("artists", []) or []
        )
        raw_album_images: List[Dict[str, Any]] = cast(
            List[Dict[str, Any]], raw_album.get("images", []) or []
        )
        album = ScrappedAlbum(
            id=cast(str, raw_album.get("id", "")),
            name=cast(str, raw_album.get("name", "")),
            artists=[parse_artist(a) for a in raw_album_artists],
            images=[parse_image(i) for i in raw_album_images],
            release_date=cast(str, raw_album.get("release_date", "")),
            total_tracks=cast(int, raw_album.get("total_tracks", 0)),
        )
    raw_ext_ids: Dict[str, Any] = cast(
        Dict[str, Any], raw.get("external_ids", {}) or {}
    )
    return ScrappedTrack(
        id=cast(str, raw.get("id", "")),
        name=cast(str, raw.get("name", "")),
        artists=[parse_artist(a) for a in raw_artists],
        album=album,
        duration_ms=cast(int, raw.get("duration_ms", 0) or 0),
        track_number=cast(int, raw.get("track_number", 0) or 0),
        disc_number=cast(int, raw.get("disc_number", 1) or 1),
        popularity=cast(int, raw.get("popularity", 0) or 0),
        isrc=cast(str, raw_ext_ids.get("isrc", "")),
        preview_url=cast(str | None, raw.get("preview_url")),
    )


def parse_album(raw: Dict[str, Any]) -> ScrappedAlbum:
    raw_artists: List[Dict[str, Any]] = cast(
        List[Dict[str, Any]], raw.get("artists", []) or []
    )
    raw_images: List[Dict[str, Any]] = cast(
        List[Dict[str, Any]], raw.get("images", []) or []
    )
    raw_tracks_obj: Dict[str, Any] | None = cast(
        Dict[str, Any] | None, raw.get("tracks")
    )
    raw_tracks: List[Dict[str, Any]]
    if raw_tracks_obj is not None:
        raw_tracks = cast(List[Dict[str, Any]], raw_tracks_obj.get("items", []) or [])
    else:
        raw_tracks = cast(List[Dict[str, Any]], raw.get("tracks", []) or [])
    raw_copyrights: List[Dict[str, str]] = cast(
        List[Dict[str, str]], raw.get("copyrights", []) or []
    )
    return ScrappedAlbum(
        id=cast(str, raw.get("id", "")),
        name=cast(str, raw.get("name", "")),
        artists=[parse_artist(a) for a in raw_artists],
        images=[parse_image(i) for i in raw_images],
        release_date=cast(str, raw.get("release_date", "")),
        total_tracks=cast(int, raw.get("total_tracks", 0)),
        popularity=cast(int, raw.get("popularity", 0) or 0),
        copyrights=[
            {"type": c.get("type", ""), "text": c.get("text", "")}
            for c in raw_copyrights
        ],
        tracks=[parse_track(t) for t in raw_tracks],
    )


def parse_playlist_item(raw: Dict[str, Any]) -> ScrappedPlaylistItem:
    raw_track: Dict[str, Any] | None = cast(Dict[str, Any] | None, raw.get("track"))
    track: ScrappedTrack | None = (
        parse_track(raw_track) if raw_track is not None else None
    )
    raw_added_by: Dict[str, Any] | None = cast(
        Dict[str, Any] | None, raw.get("added_by")
    )
    return ScrappedPlaylistItem(
        track=track,
        added_at=cast(str, raw.get("added_at", "")),
        added_by=cast(
            str, raw_added_by.get("id", "") if raw_added_by is not None else ""
        ),
    )


def parse_playlist(raw: Dict[str, Any]) -> ScrappedPlaylist:
    raw_images: List[Dict[str, Any]] = cast(
        List[Dict[str, Any]], raw.get("images", []) or []
    )
    raw_tracks_obj: Dict[str, Any] | None = cast(
        Dict[str, Any] | None, raw.get("tracks")
    )
    raw_tracks: List[Dict[str, Any]]
    if raw_tracks_obj is not None:
        raw_tracks = cast(List[Dict[str, Any]], raw_tracks_obj.get("items", []) or [])
    else:
        raw_tracks = cast(List[Dict[str, Any]], [])
    raw_owner: Dict[str, Any] = cast(Dict[str, Any], raw.get("owner", {}) or {})
    return ScrappedPlaylist(
        id=cast(str, raw.get("id", "")),
        name=cast(str, raw.get("name", "")),
        description=cast(str, raw.get("description", "") or ""),
        images=[parse_image(i) for i in raw_images],
        owner=cast(
            str, raw_owner.get("display_name", "") or raw_owner.get("id", "") or ""
        ),
        tracks=[parse_playlist_item(t) for t in raw_tracks],
    )
