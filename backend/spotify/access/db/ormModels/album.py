from typing import List, TYPE_CHECKING, Dict

from sqlalchemy import ForeignKey, String, Integer
from sqlalchemy.orm import relationship, mapped_column, Mapped

from backend.core.access.db.base import Base
from backend.core.access.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated
from backend.spotify.access.db.associationTables.album_artists import album_artists
from backend.spotify.access.db.associationTables.album_copyrights import album_copyrights
from backend.spotify.access.db.associationTables.album_external_images import album_external_images

if TYPE_CHECKING:
    from backend.spotify.access.db.ormModels.track import TrackRow
    from backend.spotify.access.db.ormModels.artist import ArtistRow
    from backend.spotify.access.db.ormModels.copyright import CopyrightRow
    from backend.spotify.access.db.ormModels.internalImage import InternalImageRow
    from backend.spotify.access.db.ormModels.externalImage import ExternalImageRow


class AlbumRow(Base, TableDateUpdated, TableDateAdded):
    __tablename__ = "albums"
    __table_args__ = {'schema': 'spotify', 'extend_existing': True},

    id: Mapped[int] = mapped_column(Integer,  primary_key=True)
    public_id: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    internal_image_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("spotify.internal_images.id"),
        nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    release_date: Mapped[str] = mapped_column(String, nullable=False)
    popularity: Mapped[int] = mapped_column(Integer, nullable=False)
    disc_count: Mapped[int] = mapped_column(Integer, nullable=False)

    # ORM relationship
    internal_image: Mapped["InternalImageRow"] = relationship(
        "InternalImageRow",
        back_populates="albums")

    songs: Mapped[List["TrackRow"]] = relationship(
        "TrackRow",
        back_populates="album")

    artists: Mapped[List["ArtistRow"]] = relationship(
        "ArtistRow",
        secondary=album_artists,
        back_populates="albums")

    external_images: Mapped[List["ExternalImageRow"]] = relationship(
        "ExternalImageRow",
        secondary=album_external_images,
        back_populates="albums"
    )

    copyrights: Mapped[List["CopyrightRow"]] = relationship(
        "CopyrightRow",
        secondary=album_copyrights,
        back_populates="albums"
    )

    def __init__(self, id: int, public_id: str, internal_image_id: int, name: str, release_date: str, popularity: int, disc_count: int):
        kwargs: Dict[str, int | str] = {}
        kwargs['id'] = id
        kwargs['public_id'] = public_id
        kwargs['internal_image_id'] = internal_image_id
        kwargs['name'] = name
        kwargs['release_date'] = release_date
        kwargs['popularity'] = popularity
        kwargs['disc_count'] = disc_count
        for k, v in kwargs.items():
            setattr(self, k, v)
