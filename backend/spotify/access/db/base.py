from sqlalchemy.orm import declarative_base

from backend.core.access.db.base import global_metadata

SpotifyBase = declarative_base(metadata=global_metadata)
SpotifyBase.metadata.schema = "spotify"
