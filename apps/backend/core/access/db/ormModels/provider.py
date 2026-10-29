from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.access.db.base import CoreBase
from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
)

if TYPE_CHECKING:
    from core.access.db.ormModels.media import CoreMediaRow


class ProviderRow(CoreBase, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = "provider"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    name: Mapped[str] = mapped_column(String, nullable=False, unique=True)

    module: Mapped[str] = mapped_column(String, nullable=False, unique=True)

    disabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    medias: Mapped[list["CoreMediaRow"]] = relationship(
        "CoreMediaRow", back_populates="provider", uselist=True
    )

    def __init__(
        self, name: str, module: str, disabled: bool = False, id: int | None = None
    ) -> None:
        kwargs: dict[str, None | bool | int | str] = {}
        kwargs["name"] = name
        kwargs["module"] = module
        kwargs["disabled"] = disabled
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
