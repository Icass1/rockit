from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.access.db.base import CoreBase
from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
)

if TYPE_CHECKING:
    from core.access.db.ormModels.language import LanguageRow


class VocabularyRow(CoreBase, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = "vocabulary"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    key: Mapped[str] = mapped_column(String, nullable=False)
    lang_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.language.id"), nullable=False)
    value: Mapped[str] = mapped_column(String, nullable=False)

    language: Mapped["LanguageRow"] = relationship("LanguageRow", back_populates="vocabulary")

    def __init__(self, key: str, lang_id: int, value: str, id: int | None = None) -> None:
        kwargs: dict[str, None | int | str] = {}
        kwargs["key"] = key
        kwargs["lang_id"] = lang_id
        kwargs["value"] = value
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
