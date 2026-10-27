from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, WriteOnlyMapped, mapped_column, relationship

from core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
)
from core.access.db.ormModels.image import ImageRow
from core.access.db.ormModels.media import CoreMediaRow
from spotifyScrapper.access.db.associationTables.album_artists import (
    album_artists,
)
from spotifyScrapper.access.db.associationTables.album_copyrights import (
    album_copyrights,
)
from spotifyScrapper.access.db.associationTables.album_external_images import (
    album_external_images,
)
from spotifyScrapper.access.db.base import SpotifyScrapperBase

if TYPE_CHECKING:
    from spotifyScrapper.access.db.ormModels.artist import ArtistRow
    from spotifyScrapper.access.db.ormModels.copyright import CopyrightRow
    from spotifyScrapper.access.db.ormModels.externalImage import (
        ExternalImageRow,
    )
    from spotifyScrapper.access.db.ormModels.track import TrackRow


class AlbumRow(SpotifyScrapperBase, TableDateUpdated, TableDateAdded):
    __tablename__ = "album"
    __table_args__ = (
        Index(
            "ix_spotify_scrapper_album_name_trgm",
            "name",
            postgresql_using="gin",
            postgresql_ops={"name": "gin_trgm_ops"},
        ),
        {"schema": "spotify_scrapper", "extend_existing": True},
    )

    id: Mapped[int] = mapped_column(Integer, ForeignKey("core.media.id"), primary_key=True)
    spotify_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    image_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.image.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    release_date: Mapped[str] = mapped_column(String, nullable=False)
    popularity: Mapped[int] = mapped_column(Integer, nullable=False)
    disc_count: Mapped[int] = mapped_column(Integer, nullable=False)

    songs: Mapped[list["TrackRow"]] = relationship("TrackRow", back_populates="album")

    artists: Mapped[list["ArtistRow"]] = relationship(
        "ArtistRow",
        secondary=album_artists,
        back_populates="albums",
        lazy="selectin",
        uselist=True,
    )

    external_images: WriteOnlyMapped[list["ExternalImageRow"]] = relationship(
        "ExternalImageRow",
        secondary=album_external_images,
        back_populates="albums",
        lazy="write_only",
    )

    copyrights: WriteOnlyMapped[list["CopyrightRow"]] = relationship(
        "CopyrightRow",
        secondary=album_copyrights,
        back_populates="albums",
        lazy="write_only",
    )

    core_album: Mapped["CoreMediaRow"] = relationship(CoreMediaRow, lazy="selectin", uselist=False)

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
    ) -> None:
        kwargs: dict[str, int | str] = {}
        kwargs["id"] = id
        kwargs["spotify_id"] = spotify_id
        kwargs["image_id"] = image_id
        kwargs["name"] = name
        kwargs["release_date"] = release_date
        kwargs["popularity"] = popularity
        kwargs["disc_count"] = disc_count
        for k, v in kwargs.items():
            setattr(self, k, v)
