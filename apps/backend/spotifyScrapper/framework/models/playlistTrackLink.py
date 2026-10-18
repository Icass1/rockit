from dataclasses import dataclass

from backend.spotifyScrapper.access.db.ormModels.playlist_tracks import (
    PlaylistTrackRow,
)
from backend.spotifyScrapper.access.db.ormModels.track import TrackRow


@dataclass
class PlaylistTrackLink:
    """A playlist track with its associated track row."""

    playlist_track: PlaylistTrackRow
    track: TrackRow
