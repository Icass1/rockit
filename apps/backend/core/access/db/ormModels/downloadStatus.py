from typing import TYPE_CHECKING

from sqlalchemy import DOUBLE_PRECISION, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.access.db.base import CoreBase
from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
)

if TYPE_CHECKING:
    from core.access.db.ormModels.download import DownloadRow


class DownloadStatusRow(CoreBase, TableAutoincrementId, TableDateAdded):
    __tablename__ = "download_status"
    __table_args__ = (
        Index("ix_download_status_browse", "download_id", "id"),
        {"schema": "core", "extend_existing": True},
    )

    download_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.download.id"), nullable=False
    )
    completed: Mapped[float] = mapped_column(DOUBLE_PRECISION, nullable=False)
    message: Mapped[str] = mapped_column(String, nullable=False)

    download: Mapped["DownloadRow"] = relationship(
        "DownloadRow", back_populates="download_status_list"
    )

    def __init__(
        self, download_id: int, completed: float, message: str, id: int | None = None
    ) -> None:
        kwargs: dict[str, None | float | int | str] = {}
        kwargs["download_id"] = download_id
        kwargs["completed"] = completed
        kwargs["message"] = message
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
