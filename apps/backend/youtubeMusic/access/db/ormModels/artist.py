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
    from youtubeMusic.access.db.ormModels.album import AlbumRow
    from youtubeMusic.access.db.ormModels.track import TrackRow


class ArtistRow(YoutubeMusicBase, TableDateUpdated, TableDateAdded):
    __tablename__ = "artist"
    __table_args__ = (
        Index(
            "ix_youtube_music_artist_name_trgm",
            "name",
            postgresql_using="gin",
            postgresql_ops={"name": "gin_trgm_ops"},
        ),
        {"schema": "youtube_music", "extend_existing": True},
    )

    id: Mapped[int] = mapped_column(Integer, ForeignKey("core.media.id"), primary_key=True)
    youtube_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    image_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.image.id"), nullable=False)

    tracks: Mapped[list["TrackRow"]] = relationship(
        "TrackRow",
        secondary="youtube_music.track_artists",
        back_populates="artists",
        lazy="selectin",
    )
    albums: Mapped[list["AlbumRow"]] = relationship(
        "AlbumRow",
        secondary="youtube_music.album_artists",
        back_populates="artists",
        lazy="selectin",
    )

    image: Mapped["ImageRow"] = relationship(ImageRow, lazy="selectin", uselist=False)

    core_artist: Mapped["CoreMediaRow"] = relationship(CoreMediaRow, lazy="selectin", uselist=False)

    def __init__(self, id: int, youtube_id: str, name: str, image_id: int) -> None:
        kwargs: dict[str, int | str] = {}
        kwargs["id"] = id
        kwargs["youtube_id"] = youtube_id
        kwargs["name"] = name
        kwargs["image_id"] = image_id
        for k, v in kwargs.items():
            setattr(self, k, v)
