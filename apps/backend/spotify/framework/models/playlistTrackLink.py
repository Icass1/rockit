from dataclasses import dataclass

from spotify.access.db.ormModels.playlist_tracks import PlaylistTrackRow
from spotify.access.db.ormModels.track import TrackRow


@dataclass
class PlaylistTrackLink:
    """A playlist track with its associated track row."""

    playlist_track: PlaylistTrackRow
    track: TrackRow
