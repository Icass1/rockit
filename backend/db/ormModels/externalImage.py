from typing import List, TYPE_CHECKING

from sqlalchemy import String, Integer
from sqlalchemy.orm import relationship, mapped_column, Mapped

from backend.db.base import Base
from backend.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId
from backend.db.associationTables.album_external_images import album_external_images
from backend.db.associationTables.artist_external_images import artist_external_images
from backend.db.associationTables.playlist_external_images import playlist_external_images

if TYPE_CHECKING:
    from backend.db.ormModels.album import AlbumRow
    from backend.db.ormModels.artist import ArtistRow
    from backend.db.ormModels.playlist import PlaylistRow


class ExternalImageRow(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'external_images'
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    public_id: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    url: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    width: Mapped[int] = mapped_column(Integer, nullable=True)
    height: Mapped[int] = mapped_column(Integer, nullable=True)

    albums: Mapped[List["AlbumRow"]] = relationship(
        "AlbumRow",
        secondary=album_external_images,
        back_populates="external_images"
    )
    playlists: Mapped[List["PlaylistRow"]] = relationship(
        "PlaylistRow",
        secondary=playlist_external_images,
        back_populates="external_images"
    )
    artists: Mapped[List["ArtistRow"]] = relationship(
        "ArtistRow",
        secondary=artist_external_images,
        back_populates="external_images"
    )
