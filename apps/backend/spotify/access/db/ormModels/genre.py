from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
)
from spotify.access.db.associationTables.artist_genres import artist_genres
from spotify.access.db.base import SpotifyBase

if TYPE_CHECKING:
    from spotify.access.db.ormModels.artist import ArtistRow


class GenreRow(SpotifyBase, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = "genre"
    __table_args__ = ({"schema": "spotify", "extend_existing": True},)

    name: Mapped[str] = mapped_column(String, nullable=False, unique=True)

    artists: Mapped[list["ArtistRow"]] = relationship(
        "ArtistRow", secondary=artist_genres, back_populates="genres"
    )

    def __init__(self, name: str, id: int | None = None) -> None:
        kwargs: dict[str, None | int | str] = {}
        kwargs["name"] = name
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
