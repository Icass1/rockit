from typing import Dict, List, TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableAutoincrementId,
)

if TYPE_CHECKING:
    from backend.radioBrowser.access.db.ormModels.station import StationRow
    from backend.radioBrowser.access.db.ormModels.country import CountryRow


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

    stations: Mapped[List["StationRow"]] = relationship(
        "StationRow",
        back_populates="state_rel",
    )

    def __init__(self, name: str, country_id: int | None = None):
        kwargs: Dict[str, None | int | str] = {}
        kwargs["name"] = name
        kwargs["country_id"] = country_id
        for k, v in kwargs.items():
            setattr(self, k, v)
