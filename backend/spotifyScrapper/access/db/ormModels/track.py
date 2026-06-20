from typing import List, TYPE_CHECKING, Dict

from sqlalchemy import String, ForeignKey, Integer
from sqlalchemy.orm import relationship, mapped_column, Mapped, WriteOnlyMapped

from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
    TableAutoincrementId,
)

from backend.spotifyScrapper.access.db.base import SpotifyScrapperBase
from backend.spotifyScrapper.access.db.associationTables.song_artists import (
    song_artists,
)

from backend.core.access.db.ormModels.media import CoreMediaRow

if TYPE_CHECKING:
    from backend.spotifyScrapper.access.db.ormModels.album import AlbumRow
    from backend.spotifyScrapper.access.db.ormModels.artist import ArtistRow
    from backend.spotifyScrapper.access.db.ormModels.playlist_tracks import (
        PlaylistTrackRow,
    )


class TrackRow(
    SpotifyScrapperBase, TableAutoincrementId, TableDateUpdated, TableDateAdded
):
    __tablename__ = "track"
    __table_args__ = ({"schema": "spotify_scrapper", "extend_existing": True},)

    id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.media.id"), primary_key=True
    )
    spotify_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    real_duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    track_number: Mapped[int] = mapped_column(Integer, nullable=False)
    disc_number: Mapped[int] = mapped_column(Integer, nullable=False)
    popularity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    path: Mapped[str | None] = mapped_column(String, nullable=True)
    album_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("spotify_scrapper.album.id"), nullable=False
    )
    download_url: Mapped[str | None] = mapped_column(String, nullable=True)
    preview_url: Mapped[str | None] = mapped_column(String, nullable=True)

    artists: WriteOnlyMapped[List["ArtistRow"]] = relationship(
        "ArtistRow", secondary=song_artists, back_populates="songs", lazy="write_only"
    )

    album: Mapped["AlbumRow"] = relationship(
        "AlbumRow", back_populates="songs", lazy="selectin"
    )

    playlist_song_links: Mapped[List["PlaylistTrackRow"]] = relationship(
        "PlaylistTrackRow", back_populates="track"
    )

    core_song: Mapped["CoreMediaRow"] = relationship(
        CoreMediaRow, lazy="selectin", uselist=False
    )

    def __init__(
        self,
        id: int,
        spotify_id: str,
        name: str,
        duration_ms: int,
        track_number: int,
        disc_number: int,
        album_id: int,
        real_duration_ms: int | None = None,
        popularity: int | None = None,
        path: str | None = None,
        download_url: str | None = None,
        preview_url: str | None = None,
    ):
        kwargs: Dict[str, None | int | str] = {}
        kwargs["id"] = id
        kwargs["spotify_id"] = spotify_id
        kwargs["name"] = name
        kwargs["duration_ms"] = duration_ms
        kwargs["track_number"] = track_number
        kwargs["disc_number"] = disc_number
        kwargs["album_id"] = album_id
        kwargs["real_duration_ms"] = real_duration_ms
        kwargs["popularity"] = popularity
        kwargs["path"] = path
        kwargs["download_url"] = download_url
        kwargs["preview_url"] = preview_url
        for k, v in kwargs.items():
            setattr(self, k, v)
