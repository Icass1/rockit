from typing import Dict, List, TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import mapped_column, Mapped, relationship

from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
)

from backend.rockit.access.db.base import RockitBase
from backend.rockit.access.db.associationTables.album_artists import album_artists

if TYPE_CHECKING:
    from backend.rockit.access.db.ormModels.song import RockitSongRow
    from backend.rockit.access.db.ormModels.artist import RockitArtistRow


class RockitAlbumRow(RockitBase, TableDateUpdated, TableDateAdded):
    __tablename__ = "album"
    __table_args__ = ({"schema": "rockit", "extend_existing": True},)

    id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.media.id"), primary_key=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    release_date: Mapped[str | None] = mapped_column(String, nullable=True)
    image_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.image.id"), nullable=False
    )

    songs: Mapped[List["RockitSongRow"]] = relationship(
        "RockitSongRow",
        back_populates="album",
        order_by="RockitSongRow.disc_number, RockitSongRow.track_number",
    )

    artists: Mapped[List["RockitArtistRow"]] = relationship(
        "RockitArtistRow",
        secondary=album_artists,
        back_populates="albums",
    )

    def __init__(
        self, id: int, name: str, image_id: int, release_date: str | None = None
    ):
        kwargs: Dict[str, None | int | str] = {}
        kwargs["id"] = id
        kwargs["name"] = name
        kwargs["image_id"] = image_id
        kwargs["release_date"] = release_date
        for k, v in kwargs.items():
            setattr(self, k, v)
