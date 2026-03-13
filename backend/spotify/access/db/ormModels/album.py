from typing import List, TYPE_CHECKING, Dict

from sqlalchemy import ForeignKey, String, Integer
from sqlalchemy.orm import relationship, mapped_column, Mapped, WriteOnlyMapped

from backend.spotify.access.db.base import SpotifyBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
)
from backend.spotify.access.db.associationTables.album_artists import album_artists
from backend.spotify.access.db.associationTables.album_copyrights import (
    album_copyrights,
)
from backend.spotify.access.db.associationTables.album_external_images import (
    album_external_images,
)

from backend.core.access.db.ormModels.media import CoreMediaRow
from backend.core.access.db.ormModels.image import ImageRow

if TYPE_CHECKING:
    from backend.spotify.access.db.ormModels.track import TrackRow
    from backend.spotify.access.db.ormModels.artist import ArtistRow
    from backend.spotify.access.db.ormModels.copyright import CopyrightRow
    from backend.spotify.access.db.ormModels.externalImage import ExternalImageRow


class AlbumRow(SpotifyBase, TableDateUpdated, TableDateAdded):
    __tablename__ = "album"
    __table_args__ = ({"schema": "spotify", "extend_existing": True},)

    id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.media.id"), primary_key=True
    )
    spotify_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    image_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.image.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    release_date: Mapped[str] = mapped_column(String, nullable=False)
    popularity: Mapped[int] = mapped_column(Integer, nullable=False)
    disc_count: Mapped[int] = mapped_column(Integer, nullable=False)

    # ORM relationship
    songs: Mapped[List["TrackRow"]] = relationship("TrackRow", back_populates="album")

    artists: Mapped[List["ArtistRow"]] = relationship(
        "ArtistRow",
        secondary=album_artists,
        back_populates="albums",
        lazy="selectin",
        uselist=True,
    )

    external_images: WriteOnlyMapped[List["ExternalImageRow"]] = relationship(
        "ExternalImageRow",
        secondary=album_external_images,
        back_populates="albums",
        lazy="write_only",
    )

    copyrights: WriteOnlyMapped[List["CopyrightRow"]] = relationship(
        "CopyrightRow",
        secondary=album_copyrights,
        back_populates="albums",
        lazy="write_only",
    )

    core_album: Mapped["CoreMediaRow"] = relationship(
        CoreMediaRow, lazy="selectin", uselist=False
    )

    image: Mapped["ImageRow"] = relationship(ImageRow, lazy="selectin", uselist=False)

    def __init__(
        self,
        id: int,
        spotify_id: str,
        image_id: int,
        name: str,
        release_date: str,
        popularity: int,
        disc_count: int,
    ):
        kwargs: Dict[str, int | str] = {}
        kwargs["id"] = id
        kwargs["spotify_id"] = spotify_id
        kwargs["image_id"] = image_id
        kwargs["name"] = name
        kwargs["release_date"] = release_date
        kwargs["popularity"] = popularity
        kwargs["disc_count"] = disc_count
        for k, v in kwargs.items():
            setattr(self, k, v)
