from typing import TYPE_CHECKING, Dict

from sqlalchemy import DOUBLE_PRECISION, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.lrclib.access.db.base import LrclibBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
)

if TYPE_CHECKING:
    from backend.lrclib.access.db.ormModels.lyricsRow import LyricsRow


class DynamicLyricsLineRow(LrclibBase, TableAutoincrementId):
    __tablename__ = "dynamic_lyrics_line"
    __table_args__ = ({"schema": "lrclib", "extend_existing": True},)

    lyrics_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("lrclib.lyrics.id"), nullable=False
    )
    line_number: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp_s: Mapped[float] = mapped_column(DOUBLE_PRECISION, nullable=False)

    lyrics: Mapped["LyricsRow"] = relationship(
        "LyricsRow", back_populates="dynamic_lines"
    )

    def __init__(self, lyrics_id: int, line_number: int, text: str, timestamp_s: float):
        kwargs: Dict[str, float | int | str] = {}
        kwargs["lyrics_id"] = lyrics_id
        kwargs["line_number"] = line_number
        kwargs["text"] = text
        kwargs["timestamp_s"] = timestamp_s
        for k, v in kwargs.items():
            setattr(self, k, v)
