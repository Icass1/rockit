from typing import List, TYPE_CHECKING

from sqlalchemy import String, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship, mapped_column, Mapped

from backend.db.base import Base
from backend.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated
from backend.db.associationTables.playlist_external_images import playlist_external_images
from backend.db.associationTables.playlist_songs import playlist_songs

if TYPE_CHECKING:
    from backend.db.ormModels.song import SongRow
    from backend.db.ormModels.list import ListRow
    from backend.db.ormModels.internalImage import InternalImageRow
    from backend.db.ormModels.externalImage import ExternalImageRow


class PlaylistRow(Base, TableDateUpdated, TableDateAdded):
    __tablename__ = 'playlists'
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    id: Mapped[int] = mapped_column(
        Integer, ForeignKey('lists.id'), primary_key=True)
    public_id: Mapped[int] = mapped_column(String, nullable=False, unique=True)
    internal_image_id: Mapped[int] = mapped_column(Integer, ForeignKey(
        'main.internal_images.id'), nullable=True)
    name: Mapped[int] = mapped_column(String, nullable=False)
    owner: Mapped[int] = mapped_column(String, nullable=False)
    followers: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    description: Mapped[int] = mapped_column(Text, nullable=True)

    internal_image: Mapped["InternalImageRow"] = relationship(
        'InternalImageRow', back_populates='playlists', foreign_keys=[internal_image_id])

    external_images: Mapped[List["ExternalImageRow"]] = relationship(
        "ExternalImageRow",
        secondary=playlist_external_images,
        back_populates="playlists"
    )
    songs: Mapped[List["SongRow"]] = relationship(
        "SongRow",
        secondary=playlist_songs,
        back_populates="playlists"
    )

    internal_image: Mapped["InternalImageRow"] = relationship(
        'InternalImageRow', back_populates='playlists', foreign_keys=[internal_image_id])

    list: Mapped["ListRow"] = relationship(
        "ListRow", back_populates="playlist", uselist=False)
