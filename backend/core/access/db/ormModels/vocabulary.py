from typing import TYPE_CHECKING, Dict

from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import mapped_column, relationship, Mapped

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
    TableAutoincrementId,
)

if TYPE_CHECKING:
    from backend.core.access.db.ormModels.language import LanguageRow


class VocabularyRow(CoreBase, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = "vocabulary"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    key: Mapped[str] = mapped_column(String, nullable=False)
    lang_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.language.id"), nullable=False
    )
    value: Mapped[str] = mapped_column(String, nullable=False)

    language: Mapped["LanguageRow"] = relationship(
        "LanguageRow", back_populates="vocabulary"
    )

    def __init__(self, key: str, lang_id: int, value: str):
        kwargs: Dict[str, int | str] = {}
        kwargs["key"] = key
        kwargs["lang_id"] = lang_id
        kwargs["value"] = value
        for k, v in kwargs.items():
            setattr(self, k, v)
