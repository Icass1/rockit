from typing import List, TYPE_CHECKING, Dict

from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import relationship, mapped_column, Mapped

from backend.core.access.db.ormModels.image import ImageRow
from backend.core.access.db.ormModels.media import CoreMediaRow
from backend.youtubeMusic.access.db.base import YoutubeMusicBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
)

if TYPE_CHECKING:
    from backend.youtubeMusic.access.db.ormModels.track import TrackRow
    from backend.youtubeMusic.access.db.ormModels.album import AlbumRow


class ArtistRow(YoutubeMusicBase, TableDateUpdated, TableDateAdded):
    __tablename__ = "artist"
    __table_args__ = ({"schema": "youtube_music", "extend_existing": True},)

    id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.media.id"), primary_key=True
    )
    youtube_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    image_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.image.id"), nullable=False
    )

    tracks: Mapped[List["TrackRow"]] = relationship(
        "TrackRow",
        secondary="youtube_music.track_artists",
        back_populates="artists",
        lazy="selectin",
    )
    albums: Mapped[List["AlbumRow"]] = relationship(
        "AlbumRow",
        secondary="youtube_music.album_artists",
        back_populates="artists",
        lazy="selectin",
    )

    image: Mapped["ImageRow"] = relationship(ImageRow, lazy="selectin", uselist=False)

    core_artist: Mapped["CoreMediaRow"] = relationship(
        CoreMediaRow, lazy="selectin", uselist=False
    )

    def __init__(self, id: int, youtube_id: str, name: str, image_id: int):
        kwargs: Dict[str, int | str] = {}
        kwargs["id"] = id
        kwargs["youtube_id"] = youtube_id
        kwargs["name"] = name
        kwargs["image_id"] = image_id
        for k, v in kwargs.items():
            setattr(self, k, v)
