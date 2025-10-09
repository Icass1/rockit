from typing import List, TYPE_CHECKING

from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import relationship, mapped_column, Mapped

from backend.db.base import Base
from backend.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId
from backend.db.associationTables.song_artists import song_artists
from backend.db.associationTables.album_artists import album_artists
from backend.db.associationTables.artist_genres import artist_genres
from backend.db.associationTables.artist_external_images import artist_external_images

if TYPE_CHECKING:
    from backend.db.ormModels.main.song import SongRow
    from backend.db.ormModels.main.album import AlbumRow
    from backend.db.ormModels.main.genre import GenreRow
    from backend.db.ormModels.main.internalImage import InternalImageRow
    from backend.db.ormModels.main.externalImage import ExternalImageRow


class ArtistRow(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'artists'
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    public_id: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    followers: Mapped[int] = mapped_column(Integer, nullable=False)
    popularity: Mapped[int] = mapped_column(Integer, nullable=False)
    internal_image_id: Mapped[int | None] = mapped_column(Integer, ForeignKey(
        'main.internal_images.id'), nullable=True)

    songs: Mapped[List["SongRow"]] = relationship("SongRow", secondary=song_artists,
                                                  back_populates="artists")
    albums: Mapped[List["AlbumRow"]] = relationship("AlbumRow", secondary=album_artists,
                                                    back_populates="artists")
    internal_image: Mapped["InternalImageRow"] = relationship(
        'InternalImageRow', back_populates='artists', foreign_keys=[internal_image_id])

    genres: Mapped[List["GenreRow"]] = relationship(
        "GenreRow",
        secondary=artist_genres,
        back_populates="artists"
    )

    external_images: Mapped[List["ExternalImageRow"]] = relationship(
        "ExternalImageRow",
        secondary=artist_external_images,
        back_populates="artists"
    )

    def __init__(self, public_id: str, name: str, followers: int, popularity: int, internal_image_id: int | None = None):
        kwargs = {}
        kwargs['public_id'] = public_id
        kwargs['name'] = name
        kwargs['followers'] = followers
        kwargs['popularity'] = popularity
        kwargs['internal_image_id'] = internal_image_id
        for k, v in kwargs.items():
            setattr(self, k, v)
