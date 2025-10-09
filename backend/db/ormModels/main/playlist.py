from typing import List, TYPE_CHECKING

from sqlalchemy import String, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship, mapped_column, Mapped

from backend.db.base import Base
from backend.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated
from backend.db.associationTables.playlist_songs import playlist_songs
from backend.db.associationTables.playlist_external_images import playlist_external_images

if TYPE_CHECKING:
    from backend.db.ormModels.main.song import SongRow
    from backend.db.ormModels.main.list import ListRow
    from backend.db.ormModels.main.internalImage import InternalImageRow
    from backend.db.ormModels.main.externalImage import ExternalImageRow


class PlaylistRow(Base, TableDateUpdated, TableDateAdded):
    __tablename__ = 'playlists'
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    id: Mapped[int] = mapped_column(
        Integer, ForeignKey('main.lists.id'), primary_key=True)
    public_id: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    internal_image_id: Mapped[int | None] = mapped_column(Integer, ForeignKey(
        'main.internal_images.id'), nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    owner: Mapped[str] = mapped_column(String, nullable=False)
    followers: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    internal_image: Mapped["InternalImageRow | None"] = relationship(
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

    list: Mapped["ListRow"] = relationship(
        "ListRow", back_populates="playlist", uselist=False)

    def __init__(self, id: int, public_id: str, name: str, owner: str, internal_image_id: int | None = None, followers: int = 0, description: str | None = None):
        kwargs = {}
        kwargs['id'] = id
        kwargs['public_id'] = public_id
        kwargs['name'] = name
        kwargs['owner'] = owner
        kwargs['internal_image_id'] = internal_image_id
        kwargs['followers'] = followers
        kwargs['description'] = description
        for k, v in kwargs.items():
            setattr(self, k, v)
