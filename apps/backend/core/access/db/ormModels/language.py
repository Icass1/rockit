from typing import List, TYPE_CHECKING, Dict

from sqlalchemy import String
from sqlalchemy.orm import mapped_column, relationship, Mapped

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableAutoincrementId,
)

if TYPE_CHECKING:
    from backend.core.access.db.ormModels.vocabulary import VocabularyRow


class LanguageRow(CoreBase, TableAutoincrementId, TableDateAdded):
    __tablename__ = "language"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    lang_code: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    language: Mapped[str] = mapped_column(String, nullable=False)

    vocabulary: Mapped[List["VocabularyRow"]] = relationship(
        "VocabularyRow", back_populates="language"
    )

    def __init__(self, lang_code: str, language: str):
        kwargs: Dict[str, str] = {}
        kwargs["lang_code"] = lang_code
        kwargs["language"] = language
        for k, v in kwargs.items():
            setattr(self, k, v)
