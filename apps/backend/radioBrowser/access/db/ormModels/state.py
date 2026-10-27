from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.access.db.base import CoreBase
from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
)

if TYPE_CHECKING:
    from radioBrowser.access.db.ormModels.country import CountryRow
    from radioBrowser.access.db.ormModels.station import StationRow


class StateRow(CoreBase, TableAutoincrementId, TableDateAdded):
    __tablename__ = "state"
    __table_args__ = (
        UniqueConstraint("name", "country_id", name="uq_state_name_country"),
        {"schema": "radio_browser", "extend_existing": True},
    )

    name: Mapped[str] = mapped_column(String, nullable=False)
    country_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("radio_browser.country.id"), nullable=True
    )

    country_rel: Mapped["CountryRow | None"] = relationship(
        "CountryRow",
        lazy="selectin",
    )

    stations: Mapped[list["StationRow"]] = relationship(
        "StationRow",
        back_populates="state_rel",
    )

    def __init__(self, name: str, country_id: int | None = None, id: int | None = None) -> None:
        kwargs: dict[str, None | int | str] = {}
        kwargs["name"] = name
        kwargs["country_id"] = country_id
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
