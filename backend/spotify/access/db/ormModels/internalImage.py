from typing import List, TYPE_CHECKING, Dict

from sqlalchemy import String
from sqlalchemy.orm import relationship, mapped_column, Mapped

from backend.core.access.db.base import Base
from backend.core.access.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId

if TYPE_CHECKING:
    from backend.spotify.access.db.ormModels.track import TrackRow
    from backend.spotify.access.db.ormModels.album import AlbumRow
    from backend.spotify.access.db.ormModels.playlist import PlaylistRow
    from backend.spotify.access.db.ormModels.artist import ArtistRow


class InternalImageRow(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'internal_images'
    __table_args__ = {'schema': 'spotify', 'extend_existing': True},

    public_id: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    url: Mapped[str] = mapped_column(String, nullable=False)
    path: Mapped[str] = mapped_column(String, nullable=False, unique=True)

    songs: Mapped[List["TrackRow"]] = relationship(
        "TrackRow", back_populates="internal_image")
    albums: Mapped[List["AlbumRow"]] = relationship(
        "AlbumRow", back_populates="internal_image")
    playlists: Mapped[List["PlaylistRow"]] = relationship(
        "PlaylistRow", back_populates="internal_image")
    artists: Mapped[List["ArtistRow"]] = relationship(
        "ArtistRow", back_populates="internal_image")

    def __init__(self, public_id: str, url: str, path: str):
        kwargs: Dict[str, str] = {}
        kwargs['public_id'] = public_id
        kwargs['url'] = url
        kwargs['path'] = path
        for k, v in kwargs.items():
            setattr(self, k, v)
