from typing import List, TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import relationship, mapped_column, Mapped

from backend.db.base import Base
from backend.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId
from backend.db.associationTables.artist_genres import artist_genres

if TYPE_CHECKING:
    from backend.db.ormModels.artist import ArtistRow


class GenreRow(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'genres'
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    public_id: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String, nullable=False, unique=True)

    artists: Mapped[List["ArtistRow"]] = relationship(
        "ArtistRow", secondary=artist_genres, back_populates="genres")
