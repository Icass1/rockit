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


class CodecRow(CoreBase, TableAutoincrementId, TableDateAdded):
    __tablename__ = "codec"
    __table_args__ = ({"schema": "radio_browser", "extend_existing": True},)

    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)

    stations: Mapped[List["StationRow"]] = relationship(
        "StationRow",
        back_populates="codec_rel",
    )

    def __init__(self, name: str):
        kwargs: Dict[str, str] = {}
        kwargs["name"] = name
        for k, v in kwargs.items():
            setattr(self, k, v)
