from typing import Dict

from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableAutoincrementId,
)


class StationTagRow(CoreBase, TableAutoincrementId, TableDateAdded):
    __tablename__ = "station_tag"
    __table_args__ = (
        UniqueConstraint("station_id", "tag_id", name="uq_station_tag"),
        {"schema": "radio_browser", "extend_existing": True},
    )

    station_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("radio_browser.station.id"), nullable=False
    )
    tag_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("radio_browser.tag.id"), nullable=False
    )

    def __init__(self, station_id: int, tag_id: int):
        kwargs: Dict[str, int] = {}
        kwargs["station_id"] = station_id
        kwargs["tag_id"] = tag_id
        for k, v in kwargs.items():
            setattr(self, k, v)
