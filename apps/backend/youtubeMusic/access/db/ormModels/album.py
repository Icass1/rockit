from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
)
from core.access.db.ormModels.image import ImageRow
from core.access.db.ormModels.media import CoreMediaRow
from youtubeMusic.access.db.base import YoutubeMusicBase

if TYPE_CHECKING:
    from youtubeMusic.access.db.ormModels.artist import ArtistRow
    from youtubeMusic.access.db.ormModels.track import TrackRow


class AlbumRow(YoutubeMusicBase, TableDateUpdated, TableDateAdded):
    __tablename__ = "album"
    __table_args__ = (
        Index(
            "ix_youtube_music_album_title_trgm",
            "title",
            postgresql_using="gin",
            postgresql_ops={"title": "gin_trgm_ops"},
        ),
        {"schema": "youtube_music", "extend_existing": True},
    )

    id: Mapped[int] = mapped_column(Integer, ForeignKey("core.media.id"), primary_key=True)
    youtube_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    image_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.image.id"), nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    release_date: Mapped[str] = mapped_column(String, nullable=False, default="")
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)

    tracks: Mapped[list["TrackRow"]] = relationship(
        "TrackRow", back_populates="album", lazy="selectin"
    )

    artists: Mapped[list["ArtistRow"]] = relationship(
        "ArtistRow",
        secondary="youtube_music.album_artists",
        back_populates="albums",
        lazy="selectin",
    )

    core_album: Mapped["CoreMediaRow"] = relationship(CoreMediaRow, lazy="selectin", uselist=False)

    image: Mapped["ImageRow"] = relationship(ImageRow, lazy="selectin", uselist=False)

    def __init__(
        self,
        id: int,
        youtube_id: str,
        image_id: int,
        title: str,
        release_date: str = "",
        year: int | None = None,
    ) -> None:
        kwargs: dict[str, None | int | str] = {}
        kwargs["id"] = id
        kwargs["youtube_id"] = youtube_id
        kwargs["image_id"] = image_id
        kwargs["title"] = title
        kwargs["release_date"] = release_date
        kwargs["year"] = year
        for k, v in kwargs.items():
            setattr(self, k, v)
