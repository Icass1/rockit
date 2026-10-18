from sqlalchemy import ForeignKey
from sqlalchemy.orm import relationship
from backend.core.access.db.ormModels.storageObject import StorageObjectRow
from typing import Dict

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
    TablePublicId,
)


class AppVersionRow(
    CoreBase, TableAutoincrementId, TablePublicId, TableDateAdded, TableDateUpdated
):
    __tablename__ = "app_version"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    storage_object_id: Mapped[int | None] = mapped_column(
        ForeignKey("core.storage_object.id"), nullable=True
    )
    storage_object: Mapped[StorageObjectRow | None] = relationship(lazy="selectin")

    version: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    apk_filename: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    downloads: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    def __init__(
        self,
        public_id: str,
        version: str,
        apk_filename: str,
        storage_object_id: int | None = None,
        description: str | None = None,
        downloads: int = 0,
    ):
        kwargs: Dict[str, None | int | str] = {}
        kwargs["public_id"] = public_id
        kwargs["version"] = version
        kwargs["apk_filename"] = apk_filename
        kwargs["storage_object_id"] = storage_object_id
        kwargs["description"] = description
        kwargs["downloads"] = downloads
        for k, v in kwargs.items():
            setattr(self, k, v)
