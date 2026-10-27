from sqlalchemy.orm import DeclarativeBase

from core.access.db.shared_metadata import shared_metadata


class SpotifyScrapperBase(DeclarativeBase):
    metadata = shared_metadata
