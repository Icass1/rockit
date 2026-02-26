from typing import TYPE_CHECKING, Dict

from sqlalchemy import DOUBLE_PRECISION, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
)

if TYPE_CHECKING:
    from backend.core.access.db.ormModels.download import DownloadRow


class DownloadStatusRow(
    CoreBase, TableAutoincrementId, TableDateUpdated, TableDateAdded
):
    __tablename__ = "download_status"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    download_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.download.id"), nullable=False
    )
    completed: Mapped[float] = mapped_column(DOUBLE_PRECISION, nullable=False)
    message: Mapped[str] = mapped_column(String, nullable=False)

    download: Mapped["DownloadRow"] = relationship(
        "DownloadRow", back_populates="download_status_list"
    )

    def __init__(self, download_id: int, completed: float, message: str):
        kwargs: Dict[str, float | int | str] = {}
        kwargs["download_id"] = download_id
        kwargs["completed"] = completed
        kwargs["message"] = message
        for k, v in kwargs.items():
            setattr(self, k, v)
