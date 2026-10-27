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
from spotifyScrapper.access.db.associationTables.artist_external_images import (
    artist_external_images,
)
from spotifyScrapper.access.db.associationTables.artist_genres import (
    artist_genres,
)
from spotifyScrapper.access.db.associationTables.song_artists import (
    song_artists,
)
from spotifyScrapper.access.db.base import SpotifyScrapperBase

if TYPE_CHECKING:
    from spotifyScrapper.access.db.ormModels.album import AlbumRow
    from spotifyScrapper.access.db.ormModels.externalImage import (
        ExternalImageRow,
    )
    from spotifyScrapper.access.db.ormModels.genre import GenreRow
    from spotifyScrapper.access.db.ormModels.track import TrackRow


class ArtistRow(SpotifyScrapperBase, TableDateUpdated, TableDateAdded):
    __tablename__ = "artist"
    __table_args__ = (
        Index(
            "ix_spotify_scrapper_artist_name_trgm",
            "name",
            postgresql_using="gin",
            postgresql_ops={"name": "gin_trgm_ops"},
        ),
        {"schema": "spotify_scrapper", "extend_existing": True},
    )

    id: Mapped[int] = mapped_column(Integer, ForeignKey("core.media.id"), primary_key=True)
    spotify_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    followers: Mapped[int] = mapped_column(Integer, nullable=False)
    popularity: Mapped[int] = mapped_column(Integer, nullable=False)
    image_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.image.id"), nullable=False)

    songs: Mapped[list["TrackRow"]] = relationship(
        "TrackRow", secondary=song_artists, back_populates="artists"
    )
    albums: Mapped[list["AlbumRow"]] = relationship(
        "AlbumRow", secondary=album_artists, back_populates="artists"
    )
    genres: WriteOnlyMapped[list["GenreRow"]] = relationship(
        "GenreRow", secondary=artist_genres, back_populates="artists", lazy="write_only"
    )
    external_images: WriteOnlyMapped[list["ExternalImageRow"]] = relationship(
        "ExternalImageRow",
        secondary=artist_external_images,
        back_populates="artists",
        lazy="write_only",
    )

    image: Mapped["ImageRow"] = relationship(ImageRow, lazy="selectin", uselist=False)

    core_artist: Mapped["CoreMediaRow"] = relationship(CoreMediaRow, lazy="selectin", uselist=False)

    def __init__(
        self, id: int, spotify_id: str, name: str, followers: int, popularity: int, image_id: int
    ) -> None:
        kwargs: dict[str, int | str] = {}
        kwargs["id"] = id
        kwargs["spotify_id"] = spotify_id
        kwargs["name"] = name
        kwargs["followers"] = followers
        kwargs["popularity"] = popularity
        kwargs["image_id"] = image_id
        for k, v in kwargs.items():
            setattr(self, k, v)
