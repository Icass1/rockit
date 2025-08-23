from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import relationship, mapped_column

from backend.db.base import Base

from backend.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId

from backend.db.associationTables.song_artists import song_artists
from backend.db.associationTables.album_artists import album_artists
from backend.db.associationTables.artist_genres import artist_genres
from backend.db.associationTables.artist_external_images import artist_external_images

class ArtistRow(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'artists'
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    public_id = mapped_column(String, nullable=False, unique=True)
    name = mapped_column(String)
    followers = mapped_column(Integer, nullable=False, default=0)
    popularity = mapped_column(Integer, nullable=False, default=0)
    internal_image_id = mapped_column(Integer, ForeignKey(
        'main.internal_images.id'), nullable=True)

    songs = relationship("SongRow", secondary=song_artists,
                         back_populates="artists")
    albums = relationship("AlbumRow", secondary=album_artists,
                          back_populates="artists")
    internal_image = relationship(
        'InternalImageRow', back_populates='artists', foreign_keys=[internal_image_id])

    genres = relationship(
        "GenreRow",
        secondary=artist_genres,
        back_populates="artists"
    )

    external_images = relationship(
        "ExternalImageRow",
        secondary=artist_external_images,
        back_populates="artists"
    )
