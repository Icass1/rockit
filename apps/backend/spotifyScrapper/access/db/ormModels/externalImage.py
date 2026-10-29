from typing import TYPE_CHECKING

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
    TablePublicId,
)
from spotifyScrapper.access.db.associationTables.album_external_images import (
    album_external_images,
)
from spotifyScrapper.access.db.associationTables.artist_external_images import (
    artist_external_images,
)
from spotifyScrapper.access.db.associationTables.playlist_external_images import (
    playlist_external_images,
)
from spotifyScrapper.access.db.base import SpotifyScrapperBase

if TYPE_CHECKING:
    from spotifyScrapper.access.db.ormModels.album import AlbumRow
    from spotifyScrapper.access.db.ormModels.artist import ArtistRow
    from spotifyScrapper.access.db.ormModels.playlist import PlaylistRow


class ExternalImageRow(
    SpotifyScrapperBase,
    TableAutoincrementId,
    TablePublicId,
    TableDateUpdated,
    TableDateAdded,
):
    __tablename__ = "external_image"
    __table_args__ = ({"schema": "spotify_scrapper", "extend_existing": True},)

    url: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)

    albums: Mapped[list["AlbumRow"]] = relationship(
        "AlbumRow", secondary=album_external_images, back_populates="external_images"
    )
    playlists: Mapped[list["PlaylistRow"]] = relationship(
        "PlaylistRow",
        secondary=playlist_external_images,
        back_populates="external_images",
    )
    artists: Mapped[list["ArtistRow"]] = relationship(
        "ArtistRow", secondary=artist_external_images, back_populates="external_images"
    )

    def __init__(
        self,
        url: str,
        public_id: str | None = None,
        width: int | None = None,
        height: int | None = None,
        id: int | None = None,
    ) -> None:
        kwargs: dict[str, None | int | str] = {}
        kwargs["url"] = url
        if public_id is not None:
            kwargs["public_id"] = public_id
        kwargs["width"] = width
        kwargs["height"] = height
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
