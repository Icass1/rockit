from sqlalchemy import ForeignKey, String, Integer
from sqlalchemy.orm import relationship, mapped_column, Mapped

from backend.db.base import Base

from backend.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId
from backend.db.associationTables.album_artists import album_artists
from backend.db.associationTables.album_external_images import album_external_images


class AlbumRow(Base, TableDateUpdated, TableDateAdded):
    __tablename__ = "albums"

    id: Mapped[int] = mapped_column(
        Integer, ForeignKey('lists.id'), primary_key=True)
    public_id: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    internal_image_id: Mapped[int] = mapped_column(Integer, ForeignKey(
        "main.internal_images.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    release_date: Mapped[str] = mapped_column(String, nullable=False)
    popularity: Mapped[int] = mapped_column(Integer)
    disc_count: Mapped[int] = mapped_column(Integer, nullable=False)

    # ORM relationship
    internal_image = relationship("InternalImageRow", back_populates="albums")

    songs = relationship("SongRow", back_populates="album")

    artists = relationship(
        "ArtistRow", secondary=album_artists, back_populates="albums")

    external_images = relationship(
        "ExternalImageRow",
        secondary=album_external_images,
        back_populates="albums"
    )

    list = relationship("ListRow", back_populates="album", uselist=False)
