from typing import List, TYPE_CHECKING, Dict

from sqlalchemy import String, ForeignKey, Integer
from sqlalchemy.orm import relationship, mapped_column, Mapped, WriteOnlyMapped

from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
    TableAutoincrementId,
)

from backend.core.access.db.ormModels.image import ImageRow
from backend.core.access.db.ormModels.media import CoreMediaRow
from backend.youtubeMusic.access.db.base import YoutubeMusicBase
from backend.youtubeMusic.access.db.associationTables.track_album_artists import (
    track_artists,
)

if TYPE_CHECKING:
    from backend.youtubeMusic.access.db.ormModels.album import AlbumRow
    from backend.youtubeMusic.access.db.ormModels.artist import ArtistRow
    from backend.youtubeMusic.access.db.ormModels.playlist_track import PlaylistTrackRow


class TrackRow(
    YoutubeMusicBase, TableAutoincrementId, TableDateUpdated, TableDateAdded
):
    __tablename__ = "track"
    __table_args__ = ({"schema": "youtube_music", "extend_existing": True},)

    id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.media.id"), primary_key=True
    )
    youtube_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    track_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    disc_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    image_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.image.id"), nullable=False
    )
    path: Mapped[str | None] = mapped_column(String, nullable=True)
    album_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("youtube_music.album.id"), nullable=False
    )
    isrc: Mapped[str | None] = mapped_column(String, nullable=True)
    download_url: Mapped[str | None] = mapped_column(String, nullable=True)

    artists: WriteOnlyMapped[List["ArtistRow"]] = relationship(
        "ArtistRow",
        secondary=track_artists,
        back_populates="tracks",
        lazy="write_only",
    )

    album: Mapped["AlbumRow"] = relationship("AlbumRow", back_populates="tracks")

    playlist_song_links: Mapped[List["PlaylistTrackRow"]] = relationship(
        "PlaylistTrackRow", back_populates="track"
    )

    core_song: Mapped["CoreMediaRow"] = relationship(
        CoreMediaRow, lazy="selectin", uselist=False
    )

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
    ):
        kwargs: Dict[str, None | int | str] = {}
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
