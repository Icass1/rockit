from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from core.access.db.base import CoreBase
from core.access.db.ormModels.declarativeMixin import (
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

    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.user.id"), nullable=False)
    # Ephemeral upload assembly only; completed builds are S3 objects.
    file_path: Mapped[str] = mapped_column(String, nullable=False)
    version: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    version_filename: Mapped[str] = mapped_column(String, nullable=False)
    total_chunks: Mapped[int] = mapped_column(Integer, nullable=False)
    chunks_received: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    def __init__(
        self,
        user_id: int,
        file_path: str,
        version: str,
        version_filename: str,
        total_chunks: int,
        public_id: str | None = None,
        description: str | None = None,
        chunks_received: int = 0,
        id: int | None = None,
    ) -> None:
        kwargs: dict[str, None | int | str] = {}
        kwargs["user_id"] = user_id
        kwargs["file_path"] = file_path
        kwargs["version"] = version
        kwargs["version_filename"] = version_filename
        kwargs["total_chunks"] = total_chunks
        if public_id is not None:
            kwargs["public_id"] = public_id
        kwargs["description"] = description
        kwargs["chunks_received"] = chunks_received
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
