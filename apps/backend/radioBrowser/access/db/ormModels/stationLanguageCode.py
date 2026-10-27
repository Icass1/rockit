from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from core.access.db.base import CoreBase
from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
)


class StationLanguageCodeRow(CoreBase, TableAutoincrementId, TableDateAdded):
    __tablename__ = "station_language_code"
    __table_args__ = (
        UniqueConstraint("station_id", "language_code_id", name="uq_station_language_code"),
        {"schema": "radio_browser", "extend_existing": True},
    )

    station_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("radio_browser.station.id"), nullable=False
    )
    language_code_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("radio_browser.language_code.id"), nullable=False
    )

    def __init__(self, station_id: int, language_code_id: int, id: int | None = None) -> None:
        kwargs: dict[str, None | int] = {}
        kwargs["station_id"] = station_id
        kwargs["language_code_id"] = language_code_id
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
