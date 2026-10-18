from sqlalchemy import BigInteger, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
    TablePublicId,
)


class StorageObjectRow(
    CoreBase, TableAutoincrementId, TablePublicId, TableDateAdded, TableDateUpdated
):
    __tablename__ = "storage_object"
    __table_args__ = (
        UniqueConstraint("bucket", "key", name="storage_object_bucket_key_uq"),
        {"schema": "core", "extend_existing": True},
    )

    bucket: Mapped[str] = mapped_column(String, nullable=False)
    key: Mapped[str] = mapped_column(String, nullable=False)
    original_key: Mapped[str | None] = mapped_column(String, nullable=True)
    content_type: Mapped[str | None] = mapped_column(String, nullable=True)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    etag: Mapped[str | None] = mapped_column(String, nullable=True)

    sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)

    @property
    def uri(self) -> str:
        return f"s3://{self.bucket}/{self.key}"
