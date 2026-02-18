from typing import List, TYPE_CHECKING, Dict

from sqlalchemy import String
from sqlalchemy.orm import relationship, mapped_column, Mapped

from backend.core.access.db.base import Base
from backend.core.access.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId
from backend.spotify.access.db.associationTables.artist_genres import artist_genres

if TYPE_CHECKING:
    from backend.spotify.access.db.ormModels.artist import ArtistRow


class GenreRow(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'genres'
    __table_args__ = {'schema': 'spotify', 'extend_existing': True},

    public_id: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String, nullable=False, unique=True)

    artists: Mapped[List["ArtistRow"]] = relationship(
        "ArtistRow", secondary=artist_genres, back_populates="genres")

    def __init__(self, public_id: str, name: str):
        kwargs: Dict[str, str] = {}
        kwargs['public_id'] = public_id
        kwargs['name'] = name
        for k, v in kwargs.items():
            setattr(self, k, v)
