
from sqlalchemy import String
from sqlalchemy.orm import mapped_column, Mapped
from sqlalchemy.dialects.postgresql import JSON

from backend.db.base import Base
from backend.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated


class SpotifyCacheTrackRow(Base, TableDateUpdated, TableDateAdded):
    __tablename__ = 'tracks'
    __table_args__ = {'schema': 'spotify_cache', 'extend_existing': True},

    id: Mapped[str] = mapped_column(String, primary_key=True)
    json: Mapped[dict] = mapped_column(JSON, nullable=False)

    def __init__(self, id: str, json: dict):
        kwargs = {}
        kwargs['id'] = id
        kwargs['json'] = json
        for k, v in kwargs.items():
            setattr(self, k, v)
