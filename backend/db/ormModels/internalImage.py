from typing import List, TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import relationship, mapped_column, Mapped

from backend.db.base import Base
from backend.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId

if TYPE_CHECKING:
    from backend.db.ormModels.song import SongRow
    from backend.db.ormModels.album import AlbumRow
    from backend.db.ormModels.playlist import PlaylistRow
    from backend.db.ormModels.artist import ArtistRow


class InternalImageRow(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'internal_images'
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    public_id: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    url: Mapped[str] = mapped_column(String, nullable=False)
    path: Mapped[str] = mapped_column(String, nullable=False, unique=True)

    songs: Mapped[List["SongRow"]] = relationship(
        "SongRow", back_populates="internal_image")
    albums: Mapped[List["AlbumRow"]] = relationship(
        "AlbumRow", back_populates="internal_image")
    playlists: Mapped[List["PlaylistRow"]] = relationship(
        "PlaylistRow", back_populates="internal_image")
    artists: Mapped[List["ArtistRow"]] = relationship(
        "ArtistRow", back_populates="internal_image")

    def __init__(self, public_id: str, url: str, path: str):
        kwargs = {}
        kwargs['public_id'] = public_id
        kwargs['url'] = url
        kwargs['path'] = path
        for k, v in kwargs.items():
            setattr(self, k, v)
