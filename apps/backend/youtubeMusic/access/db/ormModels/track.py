from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
)
from core.access.db.ormModels.image import ImageRow
from core.access.db.ormModels.media import CoreMediaRow
from youtubeMusic.access.db.associationTables.track_album_artists import (
    track_artists,
)
from youtubeMusic.access.db.base import YoutubeMusicBase

if TYPE_CHECKING:
    from youtubeMusic.access.db.ormModels.album import AlbumRow
    from youtubeMusic.access.db.ormModels.artist import ArtistRow
    from youtubeMusic.access.db.ormModels.playlist_track import PlaylistTrackRow


class TrackRow(YoutubeMusicBase, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = "track"
    __table_args__ = (
        Index(
            "ix_collection_youtube_music_album_order",
            "album_id",
            "disc_number",
            "track_number",
            "id",
        ),
        Index(
            "ix_youtube_music_track_title_trgm",
            "title",
            postgresql_using="gin",
            postgresql_ops={"title": "gin_trgm_ops"},
        ),
        {"schema": "youtube_music", "extend_existing": True},
    )

    id: Mapped[int] = mapped_column(Integer, ForeignKey("core.media.id"), primary_key=True)
    youtube_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    track_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    disc_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    image_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.image.id"), nullable=False)
    path: Mapped[str | None] = mapped_column(String, nullable=True)
    album_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("youtube_music.album.id"), nullable=False
    )
    isrc: Mapped[str | None] = mapped_column(String, nullable=True)
    download_url: Mapped[str | None] = mapped_column(String, nullable=True)

    artists: Mapped[list["ArtistRow"]] = relationship(
        "ArtistRow",
        secondary=track_artists,
        back_populates="tracks",
        lazy="selectin",
    )

    album: Mapped["AlbumRow"] = relationship("AlbumRow", back_populates="tracks")

    playlist_song_links: Mapped[list["PlaylistTrackRow"]] = relationship(
        "PlaylistTrackRow", back_populates="track"
    )

    core_song: Mapped["CoreMediaRow"] = relationship(CoreMediaRow, lazy="selectin", uselist=False)

    image: Mapped["ImageRow"] = relationship(ImageRow, lazy="selectin", uselist=False)

    def __init__(
        self,
        id: int,
        youtube_id: str,
        title: str,
        duration_ms: int,
        image_id: int,
        album_id: int,
        track_number: int = 1,
        disc_number: int = 1,
        path: str | None = None,
        isrc: str | None = None,
        download_url: str | None = None,
    ) -> None:
        kwargs: dict[str, None | int | str] = {}
        kwargs["id"] = id
        kwargs["youtube_id"] = youtube_id
        kwargs["title"] = title
        kwargs["duration_ms"] = duration_ms
        kwargs["image_id"] = image_id
        kwargs["album_id"] = album_id
        kwargs["track_number"] = track_number
        kwargs["disc_number"] = disc_number
        kwargs["path"] = path
        kwargs["isrc"] = isrc
        kwargs["download_url"] = download_url
        for k, v in kwargs.items():
            setattr(self, k, v)
