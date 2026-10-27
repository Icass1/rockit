from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
)
from core.access.db.ormModels.image import ImageRow
from rockit.access.db.base import RockitBase

if TYPE_CHECKING:
    from rockit.access.db.ormModels.album import RockitAlbumRow
    from rockit.access.db.ormModels.song import RockitSongRow
    from rockit.access.db.ormModels.video import RockitVideoRow


class RockitArtistRow(RockitBase, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = "artist"
    __table_args__ = ({"schema": "rockit", "extend_existing": True},)

    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    image_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.image.id"), nullable=False)

    songs: Mapped[list["RockitSongRow"]] = relationship(
        "RockitSongRow",
        secondary="rockit.song_artists",
        back_populates="artists",
    )
    albums: Mapped[list["RockitAlbumRow"]] = relationship(
        "RockitAlbumRow",
        secondary="rockit.album_artists",
        back_populates="artists",
    )
    videos: Mapped[list["RockitVideoRow"]] = relationship(
        "RockitVideoRow",
        secondary="rockit.video_artists",
        back_populates="artists",
    )

    image: Mapped["ImageRow"] = relationship(ImageRow, lazy="selectin", uselist=False)

    def __init__(self, name: str, image_id: int, id: int | None = None) -> None:
        kwargs: dict[str, None | int | str] = {}
        kwargs["name"] = name
        kwargs["image_id"] = image_id
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
