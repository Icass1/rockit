from sqlalchemy import BigInteger, ForeignKey
from sqlalchemy.orm import relationship
from backend.core.access.db.ormModels.storageObject import StorageObjectRow
from typing import Dict

from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
    TablePublicId,
)


class BuildUploadSessionRow(
    CoreBase, TableAutoincrementId, TablePublicId, TableDateUpdated, TableDateAdded
):
    __tablename__ = "build_upload_session"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id"), nullable=False
    )
    storage_object_id: Mapped[int | None] = mapped_column(
        ForeignKey("core.storage_object.id"), nullable=True
    )
    storage_object: Mapped[StorageObjectRow | None] = relationship(lazy="selectin")
    total_size: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    version: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    version_filename: Mapped[str] = mapped_column(String, nullable=False)
    total_chunks: Mapped[int] = mapped_column(Integer, nullable=False)
    chunks_received: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    def __init__(
        self,
        public_id: str,
        user_id: int,
        version: str,
        version_filename: str,
        total_chunks: int,
        storage_object_id: int | None = None,
        total_size: int = 0,
        description: str | None = None,
        chunks_received: int = 0,
    ):
        kwargs: Dict[str, None | int | str] = {}
        kwargs["public_id"] = public_id
        kwargs["user_id"] = user_id
        kwargs["version"] = version
        kwargs["version_filename"] = version_filename
        kwargs["total_chunks"] = total_chunks
        kwargs["storage_object_id"] = storage_object_id
        kwargs["total_size"] = total_size
        kwargs["description"] = description
        kwargs["chunks_received"] = chunks_received
        for k, v in kwargs.items():
            setattr(self, k, v)
