from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, WriteOnlyMapped, mapped_column, relationship

from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
)
from core.access.db.ormModels.media import CoreMediaRow
from core.access.db.ormModels.storageObject import StorageObjectRow
from spotify.access.db.associationTables.song_artists import song_artists
from spotify.access.db.base import SpotifyBase

if TYPE_CHECKING:
    from spotify.access.db.ormModels.album import AlbumRow
    from spotify.access.db.ormModels.artist import ArtistRow
    from spotify.access.db.ormModels.playlist_tracks import PlaylistTrackRow


class TrackRow(SpotifyBase, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = "track"
    __table_args__ = (
        Index(
            "ix_collection_spotify_album_order",
            "album_id",
            "disc_number",
            "track_number",
            "id",
        ),
        Index(
            "ix_spotify_track_name_trgm",
            "name",
            postgresql_using="gin",
            postgresql_ops={"name": "gin_trgm_ops"},
        ),
        {"schema": "spotify", "extend_existing": True},
    )

    id: Mapped[int] = mapped_column(Integer, ForeignKey("core.media.id"), primary_key=True)
    spotify_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    real_duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    track_number: Mapped[int] = mapped_column(Integer, nullable=False)
    disc_number: Mapped[int] = mapped_column(Integer, nullable=False)
    popularity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    storage_object_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("core.storage_object.id"), nullable=True
    )
    storage_object: Mapped["StorageObjectRow | None"] = relationship(
        StorageObjectRow, lazy="selectin"
    )
    album_id: Mapped[int] = mapped_column(Integer, ForeignKey("spotify.album.id"), nullable=False)
    isrc: Mapped[str] = mapped_column(String, nullable=False, unique=False)
    download_url: Mapped[str | None] = mapped_column(String, nullable=True)
    preview_url: Mapped[str | None] = mapped_column(String, nullable=True)

    artists: WriteOnlyMapped[list["ArtistRow"]] = relationship(
        "ArtistRow", secondary=song_artists, back_populates="songs", lazy="write_only"
    )

    album: Mapped["AlbumRow"] = relationship("AlbumRow", back_populates="songs")

    playlist_song_links: Mapped[list["PlaylistTrackRow"]] = relationship(
        "PlaylistTrackRow", back_populates="track"
    )

    core_song: Mapped["CoreMediaRow"] = relationship(CoreMediaRow, lazy="selectin", uselist=False)

    def __init__(
        self,
        id: int,
        spotify_id: str,
        name: str,
        duration_ms: int,
        track_number: int,
        disc_number: int,
        album_id: int,
        isrc: str,
        real_duration_ms: int | None = None,
        popularity: int | None = None,
        storage_object_id: int | None = None,
        download_url: str | None = None,
        preview_url: str | None = None,
    ) -> None:
        kwargs: dict[str, None | int | str] = {}
        kwargs["id"] = id
        kwargs["spotify_id"] = spotify_id
        kwargs["name"] = name
        kwargs["duration_ms"] = duration_ms
        kwargs["track_number"] = track_number
        kwargs["disc_number"] = disc_number
        kwargs["album_id"] = album_id
        kwargs["isrc"] = isrc
        kwargs["real_duration_ms"] = real_duration_ms
        kwargs["popularity"] = popularity
        kwargs["storage_object_id"] = storage_object_id
        kwargs["download_url"] = download_url
        kwargs["preview_url"] = preview_url
        for k, v in kwargs.items():
            setattr(self, k, v)
