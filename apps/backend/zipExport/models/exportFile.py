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
    cover_storage_object_id: int = 0
    cover_data: bytes | None = None
    cover_mime: str = ""


@dataclass(frozen=True)
class ExportFile:
    """A persistent S3 object key and detached tagging metadata."""

    name: str
    key: str
    tags: AudioTags | None = None
