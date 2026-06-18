from typing import List, TYPE_CHECKING, Dict

from sqlalchemy import String
from sqlalchemy.orm import relationship, mapped_column, Mapped

from backend.spotifyScrapper.access.db.base import SpotifyScrapperBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
    TableAutoincrementId,
)
from backend.spotifyScrapper.access.db.associationTables.artist_genres import (
    artist_genres,
)

if TYPE_CHECKING:
    from backend.spotifyScrapper.access.db.ormModels.artist import ArtistRow


class GenreRow(
    SpotifyScrapperBase, TableAutoincrementId, TableDateUpdated, TableDateAdded
):
    __tablename__ = "genre"
    __table_args__ = ({"schema": "spotify_scrapper", "extend_existing": True},)

    name: Mapped[str] = mapped_column(String, nullable=False, unique=True)

    artists: Mapped[List["ArtistRow"]] = relationship(
        "ArtistRow", secondary=artist_genres, back_populates="genres"
    )

    def __init__(self, name: str):
        kwargs: Dict[str, str] = {}
        kwargs["name"] = name
        for k, v in kwargs.items():
            setattr(self, k, v)
