from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, WriteOnlyMapped, mapped_column, relationship

from core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
)
from core.access.db.ormModels.image import ImageRow
from core.access.db.ormModels.media import CoreMediaRow
from spotify.access.db.associationTables.playlist_external_images import (
    playlist_external_images,
)
from spotify.access.db.base import SpotifyBase
from spotify.access.db.ormModels.externalImage import ExternalImageRow
from spotify.access.db.ormModels.playlist_tracks import PlaylistTrackRow


class PlaylistRow(SpotifyBase, TableDateUpdated, TableDateAdded):
    __tablename__ = "playlist"
    __table_args__ = ({"schema": "spotify", "extend_existing": True},)

    id: Mapped[int] = mapped_column(Integer, ForeignKey("core.media.id"), primary_key=True)
    spotify_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    image_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("core.image.id"), nullable=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    owner: Mapped[str] = mapped_column(String, nullable=False)
    followers: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    external_images: WriteOnlyMapped[list[ExternalImageRow]] = relationship(
        ExternalImageRow,
        secondary=playlist_external_images,
        back_populates="playlists",
        lazy="write_only",
    )
    playlist_song_links: Mapped[list["PlaylistTrackRow"]] = relationship(
        "PlaylistTrackRow", back_populates="playlist"
    )

    core_playlist: Mapped["CoreMediaRow"] = relationship(
        CoreMediaRow, lazy="selectin", uselist=False
    )

    image: Mapped["ImageRow"] = relationship(ImageRow, lazy="selectin", uselist=False)

    def __init__(
        self,
        id: int,
        spotify_id: str,
        name: str,
        owner: str,
        image_id: int | None = None,
        followers: int = 0,
        description: str | None = None,
    ) -> None:
        kwargs: dict[str, None | int | str] = {}
        kwargs["id"] = id
        kwargs["spotify_id"] = spotify_id
        kwargs["name"] = name
        kwargs["owner"] = owner
        kwargs["image_id"] = image_id
        kwargs["followers"] = followers
        kwargs["description"] = description
        for k, v in kwargs.items():
            setattr(self, k, v)
