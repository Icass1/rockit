from dataclasses import dataclass

from core.access.db.ormModels.media import CoreMediaRow
from spotify.access.db.ormModels.track import TrackRow


@dataclass
class TrackWithCoreMedia:
    """A track with its associated core media row."""

    track: TrackRow
    core_media: CoreMediaRow
