from typing import Any

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column

from core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
)
from spotifyScrapper.access.db.base import SpotifyScrapperBase


class CacheTrackRow(SpotifyScrapperBase, TableDateUpdated, TableDateAdded):
    __tablename__ = "cache_track"
    __table_args__ = ({"schema": "spotify_scrapper", "extend_existing": True},)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)

    def __init__(self, id: str, json: dict[str, Any]) -> None:
        kwargs: dict[str, dict[str, Any] | str] = {}
        kwargs["id"] = id
        kwargs["json"] = json
        for k, v in kwargs.items():
            setattr(self, k, v)
