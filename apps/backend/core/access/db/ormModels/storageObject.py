from sqlalchemy import BigInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from core.access.db.base import CoreBase
from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
    TablePublicId,
)


class StorageObjectRow(
    CoreBase, TableAutoincrementId, TablePublicId, TableDateAdded, TableDateUpdated
):
    __tablename__ = "storage_object"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    bucket: Mapped[str] = mapped_column(String, nullable=False)
    key: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    original_key: Mapped[str | None] = mapped_column(String, nullable=True)
    content_type: Mapped[str | None] = mapped_column(String, nullable=True)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    etag: Mapped[str | None] = mapped_column(String, nullable=True)

    def __init__(
        self,
        bucket: str,
        key: str,
        public_id: str | None = None,
        original_key: str | None = None,
        content_type: str | None = None,
        size_bytes: int = 0,
        etag: str | None = None,
        id: int | None = None,
    ) -> None:
        kwargs: dict[str, None | int | str] = {}
        kwargs["bucket"] = bucket
        kwargs["key"] = key
        if public_id is not None:
            kwargs["public_id"] = public_id
        kwargs["original_key"] = original_key
        kwargs["content_type"] = content_type
        kwargs["size_bytes"] = size_bytes
        kwargs["etag"] = etag
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
