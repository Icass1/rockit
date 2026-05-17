from dataclasses import dataclass

from backend.youtubeMusic.access.db.ormModels.playlist_track import PlaylistTrackRow
from backend.youtubeMusic.access.db.ormModels.track import TrackRow


@dataclass
class PlaylistTrackLink:
    """A playlist track with its associated track row."""

    playlist_track: PlaylistTrackRow
    track: TrackRow
