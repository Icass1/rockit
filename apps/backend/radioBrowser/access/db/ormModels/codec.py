from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.access.db.base import CoreBase
from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
)

if TYPE_CHECKING:
    from radioBrowser.access.db.ormModels.station import StationRow


class CodecRow(CoreBase, TableAutoincrementId, TableDateAdded):
    __tablename__ = "codec"
    __table_args__ = ({"schema": "radio_browser", "extend_existing": True},)

    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)

    stations: Mapped[list["StationRow"]] = relationship(
        "StationRow",
        back_populates="codec_rel",
    )

    def __init__(self, name: str, id: int | None = None) -> None:
        kwargs: dict[str, None | int | str] = {}
        kwargs["name"] = name
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
