from musicBrainz.access.db.base import MusicBrainzBase
from musicBrainz.access.db.ormModels.metadataCache import (
    MetadataCacheRow as MetadataCacheRow,
)
from musicBrainz.access.db.ormModels.requestGate import (
    RequestGateRow as RequestGateRow,
)

schemas = ["musicbrainz"]
base = MusicBrainzBase
