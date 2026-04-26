from sqlalchemy.orm import DeclarativeBase

from backend.core.access.db.shared_metadata import shared_metadata


class YoutubeBase(DeclarativeBase):
    metadata = shared_metadata
