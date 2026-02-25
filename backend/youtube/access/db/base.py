from sqlalchemy.orm import declarative_base

from backend.core.access.db.base import global_metadata

YoutubeBase = declarative_base(metadata=global_metadata)
YoutubeBase.metadata.schema = "youtube"
