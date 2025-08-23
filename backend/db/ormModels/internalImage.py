from sqlalchemy import String
from sqlalchemy.orm import relationship, mapped_column

from backend.db.base import Base

from backend.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId


class InternalImageRow(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'internal_images'
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    public_id = mapped_column(String, nullable=False, unique=True)
    url = mapped_column(String, nullable=False)
    path = mapped_column(String, nullable=False, unique=True)

    songs = relationship("SongRow", back_populates="internal_image")
    albums = relationship("AlbumRow", back_populates="internal_image")
    playlists = relationship("PlaylistRow", back_populates="internal_image")
    artists = relationship("ArtistRow", back_populates="internal_image")
