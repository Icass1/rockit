from typing import List, TYPE_CHECKING, Dict

from sqlalchemy import ForeignKey, String, Integer
from sqlalchemy.orm import relationship, mapped_column, Mapped

from backend.youtubeMusic.access.db.base import YoutubeMusicBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
)
from backend.core.access.db.ormModels.image import ImageRow
from backend.core.access.db.ormModels.media import CoreMediaRow

if TYPE_CHECKING:
    from backend.youtubeMusic.access.db.ormModels.track import TrackRow
    from backend.youtubeMusic.access.db.ormModels.artist import ArtistRow


class AlbumRow(YoutubeMusicBase, TableDateUpdated, TableDateAdded):
    __tablename__ = "album"
    __table_args__ = ({"schema": "youtube_music", "extend_existing": True},)

    id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.media.id"), primary_key=True
    )
    youtube_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    image_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.image.id"), nullable=False
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    release_date: Mapped[str] = mapped_column(String, nullable=False, default="")
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)

    tracks: Mapped[List["TrackRow"]] = relationship(
        "TrackRow", back_populates="album", lazy="selectin"
    )

    artists: Mapped[List["ArtistRow"]] = relationship(
        "ArtistRow",
        secondary="youtube_music.album_artists",
        back_populates="albums",
        lazy="selectin",
    )

    core_album: Mapped["CoreMediaRow"] = relationship(
        CoreMediaRow, lazy="selectin", uselist=False
    )

    image: Mapped["ImageRow"] = relationship(ImageRow, lazy="selectin", uselist=False)

    def __init__(
        self,
        id: int,
        youtube_id: str,
        image_id: int,
        title: str,
        release_date: str = "",
        year: int | None = None,
    ):
        kwargs: Dict[str, None | int | str] = {}
        kwargs["id"] = id
        kwargs["youtube_id"] = youtube_id
        kwargs["image_id"] = image_id
        kwargs["title"] = title
        kwargs["release_date"] = release_date
        kwargs["year"] = year
        for k, v in kwargs.items():
            setattr(self, k, v)
