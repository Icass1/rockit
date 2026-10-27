from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
)
from rockit.access.db.associationTables.video_artists import video_artists
from rockit.access.db.base import RockitBase

if TYPE_CHECKING:
    from rockit.access.db.ormModels.artist import RockitArtistRow


class RockitVideoRow(RockitBase, TableDateUpdated, TableDateAdded):
    __tablename__ = "video"
    __table_args__ = (
        Index(
            "ix_rockit_video_name_trgm",
            "name",
            postgresql_using="gin",
            postgresql_ops={"name": "gin_trgm_ops"},
        ),
        {"schema": "rockit", "extend_existing": True},
    )

    id: Mapped[int] = mapped_column(Integer, ForeignKey("core.media.id"), primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    # Historical column name; value is an S3 object key, never a disk path.
    file_path: Mapped[str] = mapped_column(String, nullable=False)
    image_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.image.id"), nullable=False)

    artists: Mapped[list["RockitArtistRow"]] = relationship(
        "RockitArtistRow",
        secondary=video_artists,
        back_populates="videos",
    )

    def __init__(self, id: int, name: str, duration_ms: int, file_path: str, image_id: int) -> None:
        kwargs: dict[str, int | str] = {}
        kwargs["id"] = id
        kwargs["name"] = name
        kwargs["duration_ms"] = duration_ms
        kwargs["file_path"] = file_path
        kwargs["image_id"] = image_id
        for k, v in kwargs.items():
            setattr(self, k, v)
