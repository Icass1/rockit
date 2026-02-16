from typing import Any, Dict

from sqlalchemy import String
from sqlalchemy.orm import mapped_column, Mapped
from sqlalchemy.dialects.postgresql import JSON

from backend.db.base import Base
from backend.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated


class SpotifyCacheAlbumRow(Base, TableDateUpdated, TableDateAdded):
    __tablename__ = 'albums'
    __table_args__ = {'schema': 'spotify_cache', 'extend_existing': True},

    id: Mapped[str] = mapped_column(String, primary_key=True)
    json: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)

    def __init__(self, id: str, json: Dict[str, Any]):
        kwargs: Dict[str, str | Dict[str, Any]] = {}
        kwargs['id'] = id
        kwargs['json'] = json
        for k, v in kwargs.items():
            setattr(self, k, v)
