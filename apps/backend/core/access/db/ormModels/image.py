from sqlalchemy.orm import relationship
from backend.core.access.db.ormModels.storageObject import StorageObjectRow
from sqlalchemy import ForeignKey, Integer
from typing import Dict

from sqlalchemy import String
from sqlalchemy.orm import mapped_column, Mapped

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
    TableAutoincrementId,
    TablePublicId,
)


class ImageRow(
    CoreBase, TableAutoincrementId, TablePublicId, TableDateUpdated, TableDateAdded
):
    __tablename__ = "image"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    url: Mapped[str | None] = mapped_column(String, nullable=True)
    storage_object_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("core.storage_object.id"), nullable=True
    )
    storage_object: Mapped[StorageObjectRow | None] = relationship(
        StorageObjectRow, lazy="selectin"
    )
    dominant_color: Mapped[str] = mapped_column(String, nullable=False)

    def __init__(
        self,
        public_id: str,
        dominant_color: str,
        url: str | None = None,
        storage_object_id: int | None = None,
    ):
        kwargs: Dict[str, None | int | str] = {}
        kwargs["public_id"] = public_id
        kwargs["dominant_color"] = dominant_color
        kwargs["url"] = url
        kwargs["storage_object_id"] = storage_object_id
        for k, v in kwargs.items():
            setattr(self, k, v)

    @property
    def path(self) -> str | None:
        """Internal locator derived from the storage object, never a filesystem path."""
        return self.storage_object.uri if self.storage_object is not None else None
