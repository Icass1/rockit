from typing import Any

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column

from core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
)
from spotify.access.db.base import SpotifyBase


class CacheAlbumRow(SpotifyBase, TableDateUpdated, TableDateAdded):
    __tablename__ = "cache_album"
    __table_args__ = ({"schema": "spotify_cache", "extend_existing": True},)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)

    def __init__(self, id: str, json: dict[str, Any]) -> None:
        kwargs: dict[str, dict[str, Any] | str] = {}
        kwargs["id"] = id
        kwargs["json"] = json
        for k, v in kwargs.items():
            setattr(self, k, v)
