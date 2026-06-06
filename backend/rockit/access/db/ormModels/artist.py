from typing import Dict, List, TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import mapped_column, Mapped, relationship

from backend.rockit.access.db.base import RockitBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
    TableAutoincrementId,
)
from backend.core.access.db.ormModels.image import ImageRow

if TYPE_CHECKING:
    from backend.rockit.access.db.ormModels.song import RockitSongRow
    from backend.rockit.access.db.ormModels.album import RockitAlbumRow
    from backend.rockit.access.db.ormModels.video import RockitVideoRow


class RockitArtistRow(
    RockitBase, TableAutoincrementId, TableDateUpdated, TableDateAdded
):
    __tablename__ = "artist"
    __table_args__ = ({"schema": "rockit", "extend_existing": True},)

    name: Mapped[str] = mapped_column(String, nullable=False)
    image_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.image.id"), nullable=False
    )

    songs: Mapped[List["RockitSongRow"]] = relationship(
        "RockitSongRow",
        secondary="rockit.song_artists",
        back_populates="artists",
    )
    albums: Mapped[List["RockitAlbumRow"]] = relationship(
        "RockitAlbumRow",
        secondary="rockit.album_artists",
        back_populates="artists",
    )
    videos: Mapped[List["RockitVideoRow"]] = relationship(
        "RockitVideoRow",
        secondary="rockit.video_artists",
        back_populates="artists",
    )

    image: Mapped["ImageRow"] = relationship(ImageRow, lazy="selectin", uselist=False)

    def __init__(self, name: str, image_id: int):
        kwargs: Dict[str, int | str] = {}
        kwargs["name"] = name
        kwargs["image_id"] = image_id
        for k, v in kwargs.items():
            setattr(self, k, v)
