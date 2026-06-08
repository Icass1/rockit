from typing import Dict, List, TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import mapped_column, Mapped, relationship

from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
)

from backend.rockit.access.db.base import RockitBase
from backend.rockit.access.db.associationTables.song_artists import song_artists

if TYPE_CHECKING:
    from backend.rockit.access.db.ormModels.album import RockitAlbumRow
    from backend.rockit.access.db.ormModels.artist import RockitArtistRow


class RockitSongRow(RockitBase, TableDateUpdated, TableDateAdded):
    __tablename__ = "song"
    __table_args__ = ({"schema": "rockit", "extend_existing": True},)

    id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.media.id"), primary_key=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    file_path: Mapped[str] = mapped_column(String, nullable=False)
    image_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.image.id"), nullable=False
    )
    album_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("rockit.album.id"), nullable=True
    )
    disc_number: Mapped[int] = mapped_column(Integer, nullable=False)
    track_number: Mapped[int] = mapped_column(Integer, nullable=False)

    album: Mapped["RockitAlbumRow"] = relationship(
        "RockitAlbumRow", back_populates="songs"
    )

    artists: Mapped[List["RockitArtistRow"]] = relationship(
        "RockitArtistRow",
        secondary=song_artists,
        back_populates="songs",
    )

    def __init__(
        self,
        id: int,
        name: str,
        duration_ms: int,
        file_path: str,
        image_id: int,
        disc_number: int,
        track_number: int,
        album_id: int | None = None,
    ):
        kwargs: Dict[str, None | int | str] = {}
        kwargs["id"] = id
        kwargs["name"] = name
        kwargs["duration_ms"] = duration_ms
        kwargs["file_path"] = file_path
        kwargs["image_id"] = image_id
        kwargs["disc_number"] = disc_number
        kwargs["track_number"] = track_number
        kwargs["album_id"] = album_id
        for k, v in kwargs.items():
            setattr(self, k, v)
