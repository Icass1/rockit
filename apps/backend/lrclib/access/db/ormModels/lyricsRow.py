from typing import TYPE_CHECKING

from sqlalchemy import DOUBLE_PRECISION, ForeignKey, Index, Integer
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
    TablePublicId,
)
from lrclib.access.db.base import LrclibBase

if TYPE_CHECKING:
    from lrclib.access.db.ormModels.dynamicLyricsLineRow import (
        DynamicLyricsLineRow,
    )
    from lrclib.access.db.ormModels.lyricsLineRow import LyricsLineRow


class LyricsRow(LrclibBase, TableAutoincrementId, TablePublicId, TableDateUpdated, TableDateAdded):
    __tablename__ = "lyrics"
    __table_args__ = (
        Index("ix_lyrics_search_document", "search_document", postgresql_using="gin"),
        {"schema": "lrclib", "extend_existing": True},
    )

    search_document: Mapped[str] = mapped_column(TSVECTOR, nullable=False, server_default="")

    media_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.media.id"), nullable=False, unique=True
    )
    offset: Mapped[float] = mapped_column(
        DOUBLE_PRECISION, nullable=False, default=0.0, server_default="0"
    )

    lines: Mapped[list["LyricsLineRow"]] = relationship(
        "LyricsLineRow", back_populates="lyrics", cascade="all, delete-orphan"
    )
    dynamic_lines: Mapped[list["DynamicLyricsLineRow"]] = relationship(
        "DynamicLyricsLineRow",
        back_populates="lyrics",
        cascade="all, delete-orphan",
    )

    def __init__(
        self,
        media_id: int,
        public_id: str | None = None,
        search_document: str = "",
        offset: float = 0.0,
        id: int | None = None,
    ) -> None:
        kwargs: dict[str, None | float | int | str] = {}
        kwargs["media_id"] = media_id
        if public_id is not None:
            kwargs["public_id"] = public_id
        kwargs["search_document"] = search_document
        kwargs["offset"] = offset
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
