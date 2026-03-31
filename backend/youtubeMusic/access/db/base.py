from sqlalchemy.orm import declarative_base

from backend.core.access.db.base import global_metadata

YoutubeMusicBase = declarative_base(metadata=global_metadata)
YoutubeMusicBase.metadata.schema = "youtube_music"
