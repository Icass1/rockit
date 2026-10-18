from sqlalchemy.orm import DeclarativeBase

from backend.core.access.db.shared_metadata import shared_metadata


class YoutubeMusicBase(DeclarativeBase):
    metadata = shared_metadata
