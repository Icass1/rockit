from typing import List, TYPE_CHECKING, Dict

from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import relationship, mapped_column, Mapped, WriteOnlyMapped

from backend.spotify.access.db.base import SpotifyBase
from backend.core.access.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated
from backend.spotify.access.db.associationTables.song_artists import song_artists
from backend.spotify.access.db.associationTables.album_artists import album_artists
from backend.spotify.access.db.associationTables.artist_genres import artist_genres
from backend.spotify.access.db.associationTables.artist_external_images import artist_external_images

if TYPE_CHECKING:
    from backend.spotify.access.db.ormModels.track import TrackRow
    from backend.spotify.access.db.ormModels.album import AlbumRow
    from backend.spotify.access.db.ormModels.genre import GenreRow
    from backend.spotify.access.db.ormModels.externalImage import ExternalImageRow


class ArtistRow(SpotifyBase, TableDateUpdated, TableDateAdded):
    __tablename__ = 'artist'
    __table_args__ = {'schema': 'spotify', 'extend_existing': True},

    id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey('core.artist.id'),
        primary_key=True)
    spotify_id: Mapped[str] = mapped_column(
        String,
        unique=True,
        nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    followers: Mapped[int] = mapped_column(Integer, nullable=False)
    popularity: Mapped[int] = mapped_column(Integer, nullable=False)
    internal_image_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey('core.image.id'),
        nullable=True)

    songs: Mapped[List["TrackRow"]] = relationship(
        "TrackRow",
        secondary=song_artists,
        back_populates="artists")
    albums: Mapped[List["AlbumRow"]] = relationship(
        "AlbumRow",
        secondary=album_artists,
        back_populates="artists")
    genres: WriteOnlyMapped[List["GenreRow"]] = relationship(
        "GenreRow",
        secondary=artist_genres,
        back_populates="artists",
        lazy="write_only")
    external_images: WriteOnlyMapped[List["ExternalImageRow"]] = relationship(
        "ExternalImageRow",
        secondary=artist_external_images,
        back_populates="artists",
        lazy="write_only")

    def __init__(self, id: int, spotify_id: str, name: str, followers: int, popularity: int, internal_image_id: int | None = None):
        kwargs: Dict[str, None | int | str] = {}
        kwargs['id'] = id
        kwargs['spotify_id'] = spotify_id
        kwargs['name'] = name
        kwargs['followers'] = followers
        kwargs['popularity'] = popularity
        kwargs['internal_image_id'] = internal_image_id
        for k, v in kwargs.items():
            setattr(self, k, v)
