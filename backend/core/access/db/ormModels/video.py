from typing import TYPE_CHECKING, Dict

from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import mapped_column, Mapped, relationship

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
    TableAutoincrementId,
    TablePublicId,
)

if TYPE_CHECKING:
    from backend.core.access.db.ormModels.provider import ProviderRow


class CoreVideoRow(
    CoreBase, TableAutoincrementId, TablePublicId, TableDateUpdated, TableDateAdded
):
    __tablename__ = "video"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    view_type: Mapped[str] = mapped_column(String, nullable=False)
    provider_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("core.provider.id"), nullable=True
    )

    provider: Mapped["ProviderRow"] = relationship(
        "ProviderRow", back_populates="videos", uselist=False
    )

    def __init__(
        self,
        public_id: str,
        name: str,
        view_type: str,
        description: str | None = None,
        provider_id: int | None = None,
    ):
        kwargs: Dict[str, None | int | str] = {}
        kwargs["public_id"] = public_id
        kwargs["name"] = name
        kwargs["view_type"] = view_type
        kwargs["description"] = description
        kwargs["provider_id"] = provider_id
        for k, v in kwargs.items():
            setattr(self, k, v)
