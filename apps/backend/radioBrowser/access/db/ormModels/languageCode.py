from __future__ import annotations

from typing import Dict, List, TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableAutoincrementId,
)

if TYPE_CHECKING:
    from backend.radioBrowser.access.db.ormModels.station import StationRow


class LanguageCodeRow(CoreBase, TableAutoincrementId, TableDateAdded):
    __tablename__ = "language_code"
    __table_args__ = ({"schema": "radio_browser", "extend_existing": True},)

    language_code: Mapped[str] = mapped_column(String, unique=True, nullable=False)

    stations: Mapped[List["StationRow"]] = relationship(
        "StationRow",
        secondary="radio_browser.station_language_code",
        back_populates="language_codes_rel",
    )

    def __init__(self, language_code: str):
        kwargs: Dict[str, str] = {}
        kwargs["language_code"] = language_code
        for k, v in kwargs.items():
            setattr(self, k, v)
