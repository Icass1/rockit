from typing import Dict, List, TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import mapped_column, Mapped, relationship

from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
)
from backend.rockit.access.db.base import RockitBase
from backend.rockit.access.db.associationTables.video_artists import video_artists

if TYPE_CHECKING:
    from backend.rockit.access.db.ormModels.artist import RockitArtistRow


class RockitVideoRow(RockitBase, TableDateUpdated, TableDateAdded):
    __tablename__ = "video"
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

    artists: Mapped[List["RockitArtistRow"]] = relationship(
        "RockitArtistRow",
        secondary=video_artists,
        back_populates="videos",
    )

    def __init__(
        self, id: int, name: str, duration_ms: int, file_path: str, image_id: int
    ):
        kwargs: Dict[str, int | str] = {}
        kwargs["id"] = id
        kwargs["name"] = name
        kwargs["duration_ms"] = duration_ms
        kwargs["file_path"] = file_path
        kwargs["image_id"] = image_id
        for k, v in kwargs.items():
            setattr(self, k, v)
