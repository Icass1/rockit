from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.access.db.base import CoreBase
from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
)

if TYPE_CHECKING:
    from core.access.db.ormModels.vocabulary import VocabularyRow


class LanguageRow(CoreBase, TableAutoincrementId, TableDateAdded):
    __tablename__ = "language"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    lang_code: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    language: Mapped[str] = mapped_column(String, nullable=False)

    vocabulary: Mapped[list["VocabularyRow"]] = relationship(
        "VocabularyRow", back_populates="language"
    )

    def __init__(self, lang_code: str, language: str, id: int | None = None) -> None:
        kwargs: dict[str, None | int | str] = {}
        kwargs["lang_code"] = lang_code
        kwargs["language"] = language
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
