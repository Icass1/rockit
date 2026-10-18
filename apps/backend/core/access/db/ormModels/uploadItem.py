from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
)
from backend.core.access.db.ormModels.storageObject import StorageObjectRow


class UploadItemRow(CoreBase, TableAutoincrementId, TableDateAdded):
    __tablename__ = "upload_item"
    __table_args__ = (
        UniqueConstraint("upload_id", "name", name="upload_item_name_uq"),
        {"schema": "core"},
    )
    upload_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("core.user.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    storage_object_id: Mapped[int] = mapped_column(
        ForeignKey("core.storage_object.id"), nullable=False
    )
    storage_object: Mapped[StorageObjectRow] = relationship(lazy="selectin")
