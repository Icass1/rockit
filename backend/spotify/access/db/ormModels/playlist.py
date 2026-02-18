from typing import List, TYPE_CHECKING, Dict

from sqlalchemy import String, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship, mapped_column, Mapped

from backend.core.access.db.base import Base
from backend.core.access.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated
from backend.spotify.access.db.associationTables.playlist_external_images import playlist_external_images
from backend.spotify.access.db.ormModels.playlist_tracks import PlaylistTrackRow

if TYPE_CHECKING:
    from backend.spotify.access.db.ormModels.internalImage import InternalImageRow
    from backend.spotify.access.db.ormModels.externalImage import ExternalImageRow


class PlaylistRow(Base, TableDateUpdated, TableDateAdded):
    __tablename__ = 'playlist'
    __table_args__ = {'schema': 'spotify', 'extend_existing': True},

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    public_id: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    internal_image_id: Mapped[int | None] = mapped_column(Integer, ForeignKey(
        'spotify.internal_image.id'), nullable=True)
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
    playlist_song_links: Mapped[List["PlaylistTrackRow"]] = relationship(
        "PlaylistTrackRow",
        back_populates="playlist"
    )

    def __init__(self, id: int, public_id: str, name: str, owner: str, internal_image_id: int | None = None, followers: int = 0, description: str | None = None):
        kwargs: Dict[str, None | int | str] = {}
        kwargs['id'] = id
        kwargs['public_id'] = public_id
        kwargs['name'] = name
        kwargs['owner'] = owner
        kwargs['internal_image_id'] = internal_image_id
        kwargs['followers'] = followers
        kwargs['description'] = description
        for k, v in kwargs.items():
            setattr(self, k, v)
