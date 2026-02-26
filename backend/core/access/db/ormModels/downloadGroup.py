from datetime import datetime
from typing import TYPE_CHECKING, Dict, List

from sqlalchemy import TIMESTAMP, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
    TablePublicId,
)

if TYPE_CHECKING:
    from backend.core.access.db.ormModels.download import DownloadRow


class DownloadGroupRow(
    CoreBase, TableAutoincrementId, TablePublicId, TableDateUpdated, TableDateAdded
):
    __tablename__ = "download_group"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id"), nullable=False
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    date_started: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False
    )
    date_ended: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    status_key: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.download_status_enum.key"), nullable=False, default=1
    )
    success: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fail: Mapped[int | None] = mapped_column(Integer, nullable=True)

    downloads: Mapped[List["DownloadRow"]] = relationship(
        "DownloadRow", back_populates="download_group"
    )

    def __init__(
        self,
        public_id: str,
        user_id: int,
        title: str,
        date_started: datetime,
        date_ended: datetime | None = None,
        status_key: int = 1,
        success: int | None = None,
        fail: int | None = None,
    ):
        kwargs: Dict[str, None | datetime | int | str] = {}
        kwargs["public_id"] = public_id
        kwargs["user_id"] = user_id
        kwargs["title"] = title
        kwargs["date_started"] = date_started
        kwargs["date_ended"] = date_ended
        kwargs["status_key"] = status_key
        kwargs["success"] = success
        kwargs["fail"] = fail
        for k, v in kwargs.items():
            setattr(self, k, v)
