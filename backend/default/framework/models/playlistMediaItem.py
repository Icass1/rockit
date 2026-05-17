from dataclasses import dataclass


@dataclass
class PlaylistMediaItem:
    """An item in a playlist media group."""

    index: int
    media_id: str
    playlist_media_id: int
