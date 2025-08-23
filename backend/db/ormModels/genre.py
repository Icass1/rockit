from sqlalchemy import String, Integer
from sqlalchemy.orm import relationship, mapped_column

from backend.db.base import Base

from backend.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId
from backend.db.associationTables.artist_genres import artist_genres


class GenreRow(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'genres'
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    public_id = mapped_column(String, nullable=False, unique=True)
    name = mapped_column(String, nullable=False, unique=True)

    artists = relationship(
        "ArtistRow", secondary=artist_genres, back_populates="genres")