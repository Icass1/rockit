from typing import List, TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Integer
from sqlalchemy.orm import relationship, mapped_column, Mapped

from backend.db.base import Base
from backend.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated
from backend.db.associationTables.album_artists import album_artists
from backend.db.associationTables.album_copyrights import album_copyrights
from backend.db.associationTables.album_external_images import album_external_images

if TYPE_CHECKING:
    from backend.db.ormModels.song import SongRow
    from backend.db.ormModels.list import ListRow
    from backend.db.ormModels.artist import ArtistRow
    from backend.db.ormModels.copyright import CopyrightRow
    from backend.db.ormModels.internalImage import InternalImageRow
    from backend.db.ormModels.externalImage import ExternalImageRow
    from backend.db.ormModels.downloadStatus import DownloadStatusRow


class AlbumRow(Base, TableDateUpdated, TableDateAdded):
    __tablename__ = "albums"
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    id: Mapped[int] = mapped_column(
        Integer, ForeignKey('main.lists.id'), primary_key=True)
    public_id: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    internal_image_id: Mapped[int] = mapped_column(Integer, ForeignKey(
        "main.internal_images.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    release_date: Mapped[str] = mapped_column(String, nullable=False)
    popularity: Mapped[int] = mapped_column(Integer, nullable=False)
    disc_count: Mapped[int] = mapped_column(Integer, nullable=False)

    # ORM relationship
    internal_image: Mapped["InternalImageRow"] = relationship(
        "InternalImageRow", back_populates="albums")

    songs: Mapped[List["SongRow"]] = relationship(
        "SongRow", back_populates="album")

    artists: Mapped[List["ArtistRow"]] = relationship(
        "ArtistRow", secondary=album_artists, back_populates="albums")

    external_images: Mapped[List["ExternalImageRow"]] = relationship(
        "ExternalImageRow",
        secondary=album_external_images,
        back_populates="albums"
    )

    list: Mapped["ListRow"] = relationship(
        "ListRow", back_populates="album", uselist=False)

    copyrights: Mapped[List["CopyrightRow"]] = relationship(
        "CopyrightRow",
        secondary=album_copyrights,
        back_populates="albums"
    )

    def __init__(self, id: int, public_id: str, internal_image_id: int, name: str, release_date: str, popularity: int, disc_count: int):
        kwargs = {}
        kwargs['id'] = id
        kwargs['public_id'] = public_id
        kwargs['internal_image_id'] = internal_image_id
        kwargs['name'] = name
        kwargs['release_date'] = release_date
        kwargs['popularity'] = popularity
        kwargs['disc_count'] = disc_count
        for k, v in kwargs.items():
            setattr(self, k, v)
