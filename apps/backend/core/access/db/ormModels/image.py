from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.access.db.base import CoreBase
from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
    TablePublicId,
)

if TYPE_CHECKING:
    from core.access.db.ormModels.storageObject import StorageObjectRow


class ImageRow(CoreBase, TableAutoincrementId, TablePublicId, TableDateUpdated, TableDateAdded):
    __tablename__ = "image"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    dominant_color: Mapped[str] = mapped_column(String, nullable=False, default="")
    storage_object_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.storage_object.id"), nullable=False
    )

    storage_object: Mapped["StorageObjectRow"] = relationship(
        "StorageObjectRow", lazy="selectin", uselist=False
    )

    def __init__(
        self,
        storage_object_id: int,
        public_id: str | None = None,
        dominant_color: str = "",
        id: int | None = None,
    ) -> None:
        kwargs: dict[str, None | int | str] = {}
        kwargs["storage_object_id"] = storage_object_id
        if public_id is not None:
            kwargs["public_id"] = public_id
        kwargs["dominant_color"] = dominant_color
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
