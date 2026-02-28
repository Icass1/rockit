from typing import List, Dict

from sqlalchemy import String, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship, mapped_column, Mapped, WriteOnlyMapped

from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
)

from backend.spotify.access.db.base import SpotifyBase
from backend.spotify.access.db.associationTables.playlist_external_images import (
    playlist_external_images,
)
from backend.spotify.access.db.ormModels.playlist_tracks import PlaylistTrackRow
from backend.spotify.access.db.ormModels.externalImage import ExternalImageRow


class PlaylistRow(SpotifyBase, TableDateUpdated, TableDateAdded):
    __tablename__ = "playlist"
    __table_args__ = ({"schema": "spotify", "extend_existing": True},)

    id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.playlist.id"), primary_key=True
    )
    spotify_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    internal_image_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("core.image.id"), nullable=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    owner: Mapped[str] = mapped_column(String, nullable=False)
    followers: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    external_images: WriteOnlyMapped[List[ExternalImageRow]] = relationship(
        ExternalImageRow,
        secondary=playlist_external_images,
        back_populates="playlists",
        lazy="write_only",
    )
    playlist_song_links: Mapped[List["PlaylistTrackRow"]] = relationship(
        "PlaylistTrackRow", back_populates="playlist"
    )

    def __init__(
        self,
        id: int,
        spotify_id: str,
        name: str,
        owner: str,
        internal_image_id: int | None = None,
        followers: int = 0,
        description: str | None = None,
    ):
        kwargs: Dict[str, None | int | str] = {}
        kwargs["id"] = id
        kwargs["spotify_id"] = spotify_id
        kwargs["name"] = name
        kwargs["owner"] = owner
        kwargs["internal_image_id"] = internal_image_id
        kwargs["followers"] = followers
        kwargs["description"] = description
        for k, v in kwargs.items():
            setattr(self, k, v)
