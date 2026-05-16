from datetime import datetime
from typing import TYPE_CHECKING, Dict, List

from sqlalchemy import TIMESTAMP, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
    TablePublicId,
)

if TYPE_CHECKING:
    from backend.core.access.db.ormModels.downloadGroup import DownloadGroupRow
    from backend.core.access.db.ormModels.downloadStatus import DownloadStatusRow


# To get the completed percetage of this download, the latest downoad status with the same download id will be used. So the percentage is determined by the latest download status of this download.
class DownloadRow(
    CoreBase, TableAutoincrementId, TablePublicId, TableDateUpdated, TableDateAdded
):
    __tablename__ = "download"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    download_group_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.download_group.id"), nullable=False
    )
    media_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.media.id"), nullable=False
    )
    status_key: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.download_status_enum.key"), nullable=False, default=1
    )

    date_started: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False
    )
    date_ended: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )

    download_group: Mapped["DownloadGroupRow"] = relationship(
        "DownloadGroupRow", back_populates="downloads"
    )
    download_status_list: Mapped[List["DownloadStatusRow"]] = relationship(
        "DownloadStatusRow", back_populates="download", order_by="DownloadStatusRow.id"
    )

    def __init__(
        self,
        public_id: str,
        download_group_id: int,
        media_id: int,
        date_started: datetime,
        status_key: int = 1,
        date_ended: datetime | None = None,
    ):
        kwargs: Dict[str, None | datetime | int | str] = {}
        kwargs["public_id"] = public_id
        kwargs["download_group_id"] = download_group_id
        kwargs["media_id"] = media_id
        kwargs["date_started"] = date_started
        kwargs["status_key"] = status_key
        kwargs["date_ended"] = date_ended
        for k, v in kwargs.items():
            setattr(self, k, v)
