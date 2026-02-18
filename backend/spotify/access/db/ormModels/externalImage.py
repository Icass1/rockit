from typing import List, TYPE_CHECKING, Dict

from sqlalchemy import String, Integer
from sqlalchemy.orm import relationship, mapped_column, Mapped

from backend.spotify.access.db.base import SpotifyBase
from backend.core.access.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId
from backend.spotify.access.db.associationTables.album_external_images import album_external_images
from backend.spotify.access.db.associationTables.artist_external_images import artist_external_images
from backend.spotify.access.db.associationTables.playlist_external_images import playlist_external_images

if TYPE_CHECKING:
    from backend.spotify.access.db.ormModels.album import AlbumRow
    from backend.spotify.access.db.ormModels.artist import ArtistRow
    from backend.spotify.access.db.ormModels.playlist import SpotifyPlaylistRow


class ExternalImageRow(SpotifyBase, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'external_image'
    __table_args__ = {'schema': 'spotify', 'extend_existing': True},

    public_id: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    url: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)

    albums: Mapped[List["AlbumRow"]] = relationship(
        "AlbumRow",
        secondary=album_external_images,
        back_populates="external_images"
    )
    playlists: Mapped[List["SpotifyPlaylistRow"]] = relationship(
        "SpotifyPlaylistRow",
        secondary=playlist_external_images,
        back_populates="external_images"
    )
    artists: Mapped[List["ArtistRow"]] = relationship(
        "ArtistRow",
        secondary=artist_external_images,
        back_populates="external_images"
    )

    def __init__(self, public_id: str, url: str, width: int | None = None, height: int | None = None):
        kwargs: Dict[str, None | int | str] = {}
        kwargs['public_id'] = public_id
        kwargs['url'] = url
        kwargs['width'] = width
        kwargs['height'] = height
        for k, v in kwargs.items():
            setattr(self, k, v)
