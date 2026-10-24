from sqlalchemy.orm import DeclarativeBase
from backend.core.access.db.shared_metadata import shared_metadata


class WikimediaBase(DeclarativeBase):
    metadata = shared_metadata
