from dataclasses import dataclass


@dataclass(frozen=True)
class AudioTags:
    """Detached provider metadata; no ORM objects cross into archive workers."""

    artists: tuple[str, ...] = ()
    album: str = ""
    album_artists: tuple[str, ...] = ()
    date: str = ""
    track: int = 0
    disc: int = 0
    isrc: str = ""
    cover_path: str = ""


@dataclass(frozen=True)
class ExportFile:
    name: str
    path: str
    tags: AudioTags | None = None
