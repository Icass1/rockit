from typing import TYPE_CHECKING, Dict, List

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.lrclib.access.db.base import LrclibBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
    TablePublicId,
)

if TYPE_CHECKING:
    from backend.lrclib.access.db.ormModels.dynamicLyricsLineRow import (
        DynamicLyricsLineRow,
    )
    from backend.lrclib.access.db.ormModels.lyricsLineRow import LyricsLineRow


class LyricsRow(
    LrclibBase, TableAutoincrementId, TablePublicId, TableDateUpdated, TableDateAdded
):
    __tablename__ = "lyrics"
    __table_args__ = ({"schema": "lrclib", "extend_existing": True},)

    media_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.media.id"), nullable=False, unique=True
    )

    lines: Mapped[List["LyricsLineRow"]] = relationship(
        "LyricsLineRow", back_populates="lyrics", cascade="all, delete-orphan"
    )
    dynamic_lines: Mapped[List["DynamicLyricsLineRow"]] = relationship(
        "DynamicLyricsLineRow",
        back_populates="lyrics",
        cascade="all, delete-orphan",
    )

    def __init__(self, public_id: str, media_id: int):
        kwargs: Dict[str, int | str] = {}
        kwargs["public_id"] = public_id
        kwargs["media_id"] = media_id
        for k, v in kwargs.items():
            setattr(self, k, v)
