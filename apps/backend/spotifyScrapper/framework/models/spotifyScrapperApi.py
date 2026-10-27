from dataclasses import dataclass, field
from typing import Any, cast


@dataclass
class ScrappedImage:
    url: str
    width: int | None = None
    height: int | None = None


@dataclass
class ScrappedArtist:
    id: str
    name: str
    genres: list[str] = field(default_factory=list[str])
    images: list[ScrappedImage] = field(default_factory=list[ScrappedImage])
    followers: int = 0
    popularity: int = 0


@dataclass
class ScrappedAlbum:
    id: str
    name: str
    artists: list[ScrappedArtist] = field(default_factory=list[ScrappedArtist])
    images: list[ScrappedImage] = field(default_factory=list[ScrappedImage])
    release_date: str = ""
    total_tracks: int = 0
    popularity: int = 0
    copyrights: list[dict[str, str]] = field(default_factory=list[dict[str, str]])
    tracks: list["ScrappedTrack"] = field(default_factory=lambda: cast(list["ScrappedTrack"], []))


@dataclass
class ScrappedTrack:
    id: str
    name: str
    artists: list[ScrappedArtist] = field(default_factory=list[ScrappedArtist])
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
    images: list[ScrappedImage] = field(default_factory=list[ScrappedImage])
    owner: str = ""
    tracks: list["ScrappedPlaylistItem"] = field(
        default_factory=lambda: cast(list["ScrappedPlaylistItem"], [])
    )


@dataclass
class ScrappedPlaylistItem:
    track: ScrappedTrack | None = None
    added_at: str = ""
    added_by: str = ""


@dataclass
class ScrappedSearchResults:
    tracks: list[ScrappedTrack] = field(default_factory=list[ScrappedTrack])
    albums: list[ScrappedAlbum] = field(default_factory=list[ScrappedAlbum])
    artists: list[ScrappedArtist] = field(default_factory=list[ScrappedArtist])
    playlists: list[ScrappedPlaylist] = field(default_factory=list[ScrappedPlaylist])


# ── Parse functions ──────────────────────────────────────────────────────────


def parse_image(raw: dict[str, Any]) -> ScrappedImage:
    raw_url: str = cast(str, raw.get("url", ""))
    raw_width: Any = raw.get("width")
    raw_height: Any = raw.get("height")
    return ScrappedImage(url=raw_url, width=raw_width, height=raw_height)


def parse_artist(raw: dict[str, Any]) -> ScrappedArtist:
    raw_images: list[dict[str, Any]] = cast(list[dict[str, Any]], raw.get("images", []) or [])
    raw_genres: list[str] = cast(list[str], raw.get("genres", []) or [])
    raw_followers: dict[str, Any] = cast(dict[str, Any], raw.get("followers", {}) or {})
    raw_popularity: int = cast(int, raw.get("popularity", 0) or 0)
    return ScrappedArtist(
        id=cast(str, raw.get("id", "")),
        name=cast(str, raw.get("name", "")),
        genres=raw_genres,
        images=[parse_image(i) for i in raw_images],
        followers=cast(int, raw_followers.get("total", 0) or 0),
        popularity=raw_popularity,
    )


def parse_track(raw: dict[str, Any]) -> ScrappedTrack:
    raw_artists: list[dict[str, Any]] = cast(list[dict[str, Any]], raw.get("artists", []) or [])
    raw_album: dict[str, Any] | None = cast(dict[str, Any] | None, raw.get("album"))
    album: ScrappedAlbum | None = None
    if raw_album is not None:
        raw_album_artists: list[dict[str, Any]] = cast(
            list[dict[str, Any]], raw_album.get("artists", []) or []
        )
        raw_album_images: list[dict[str, Any]] = cast(
            list[dict[str, Any]], raw_album.get("images", []) or []
        )
        album = ScrappedAlbum(
            id=cast(str, raw_album.get("id", "")),
            name=cast(str, raw_album.get("name", "")),
            artists=[parse_artist(a) for a in raw_album_artists],
            images=[parse_image(i) for i in raw_album_images],
            release_date=cast(str, raw_album.get("release_date", "")),
            total_tracks=cast(int, raw_album.get("total_tracks", 0)),
        )
    raw_ext_ids: dict[str, Any] = cast(dict[str, Any], raw.get("external_ids", {}) or {})
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


def parse_album(raw: dict[str, Any]) -> ScrappedAlbum:
    raw_artists: list[dict[str, Any]] = cast(list[dict[str, Any]], raw.get("artists", []) or [])
    raw_images: list[dict[str, Any]] = cast(list[dict[str, Any]], raw.get("images", []) or [])
    raw_tracks_obj: dict[str, Any] | None = cast(dict[str, Any] | None, raw.get("tracks"))
    raw_tracks: list[dict[str, Any]]
    if raw_tracks_obj is not None:
        raw_tracks = cast(list[dict[str, Any]], raw_tracks_obj.get("items", []) or [])
    else:
        raw_tracks = cast(list[dict[str, Any]], raw.get("tracks", []) or [])
    raw_copyrights: list[dict[str, str]] = cast(
        list[dict[str, str]], raw.get("copyrights", []) or []
    )
    return ScrappedAlbum(
        id=cast(str, raw.get("id", "")),
        name=cast(str, raw.get("name", "")),
        artists=[parse_artist(a) for a in raw_artists],
        images=[parse_image(i) for i in raw_images],
        release_date=cast(str, raw.get("release_date", "")),
        total_tracks=cast(int, raw.get("total_tracks", 0)),
        popularity=cast(int, raw.get("popularity", 0) or 0),
        copyrights=[{"type": c.get("type", ""), "text": c.get("text", "")} for c in raw_copyrights],
        tracks=[parse_track(t) for t in raw_tracks],
    )


def parse_playlist_item(raw: dict[str, Any]) -> ScrappedPlaylistItem:
    raw_track: dict[str, Any] | None = cast(dict[str, Any] | None, raw.get("track"))
    track: ScrappedTrack | None = parse_track(raw_track) if raw_track is not None else None
    raw_added_by: dict[str, Any] | None = cast(dict[str, Any] | None, raw.get("added_by"))
    return ScrappedPlaylistItem(
        track=track,
        added_at=cast(str, raw.get("added_at", "")),
        added_by=cast(str, raw_added_by.get("id", "") if raw_added_by is not None else ""),
    )


def parse_playlist(raw: dict[str, Any]) -> ScrappedPlaylist:
    raw_images: list[dict[str, Any]] = cast(list[dict[str, Any]], raw.get("images", []) or [])
    raw_tracks_obj: dict[str, Any] | None = cast(dict[str, Any] | None, raw.get("tracks"))
    raw_tracks: list[dict[str, Any]]
    if raw_tracks_obj is not None:
        raw_tracks = cast(list[dict[str, Any]], raw_tracks_obj.get("items", []) or [])
    else:
        raw_tracks = cast(list[dict[str, Any]], [])
    raw_owner: dict[str, Any] = cast(dict[str, Any], raw.get("owner", {}) or {})
    return ScrappedPlaylist(
        id=cast(str, raw.get("id", "")),
        name=cast(str, raw.get("name", "")),
        description=cast(str, raw.get("description", "") or ""),
        images=[parse_image(i) for i in raw_images],
        owner=cast(str, raw_owner.get("display_name", "") or raw_owner.get("id", "") or ""),
        tracks=[parse_playlist_item(t) for t in raw_tracks],
    )
