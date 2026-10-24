from backend.musicBrainz.access.db.base import MusicBrainzBase
from backend.musicBrainz.access.db.ormModels.metadataCache import (
    MetadataCacheRow as MetadataCacheRow,
)
from backend.musicBrainz.access.db.ormModels.requestGate import (
    RequestGateRow as RequestGateRow,
)

schemas = ["musicbrainz"]
base = MusicBrainzBase
