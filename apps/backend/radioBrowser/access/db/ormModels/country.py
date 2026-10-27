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


class CountryRow(CoreBase, TableAutoincrementId, TableDateAdded):
    __tablename__ = "country"
    __table_args__ = ({"schema": "radio_browser", "extend_existing": True},)

    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    country_code: Mapped[str] = mapped_column(String, unique=True, nullable=False)

    stations: Mapped[list["StationRow"]] = relationship(
        "StationRow",
        back_populates="country_rel",
    )

    def __init__(self, name: str, country_code: str, id: int | None = None) -> None:
        kwargs: dict[str, None | int | str] = {}
        kwargs["name"] = name
        kwargs["country_code"] = country_code
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
