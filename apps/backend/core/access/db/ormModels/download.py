from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Index, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.access.db.base import CoreBase
from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
    TablePublicId,
    TZAwareTimestamp,
)

if TYPE_CHECKING:
    from core.access.db.ormModels.downloadGroup import DownloadGroupRow
    from core.access.db.ormModels.downloadStatus import DownloadStatusRow


# To get the completed percetage of this download, the latest downoad status with the same
# download id will be used. So the percentage is determined by the latest download status of
# this download.
class DownloadRow(CoreBase, TableAutoincrementId, TablePublicId, TableDateUpdated, TableDateAdded):
    __tablename__ = "download"
    __table_args__ = (
        Index("ix_download_browse", "download_group_id", "seen", "id"),
        {"schema": "core", "extend_existing": True},
    )

    download_group_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.download_group.id"), nullable=False
    )
    media_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.media.id"), nullable=False)
    status_key: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.download_status_enum.key"), nullable=False, default=1
    )

    seen: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )

    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    date_started: Mapped[datetime] = mapped_column(TZAwareTimestamp, nullable=False)
    date_ended: Mapped[datetime | None] = mapped_column(TZAwareTimestamp, nullable=True)

    download_group: Mapped["DownloadGroupRow"] = relationship(
        "DownloadGroupRow", back_populates="downloads"
    )
    download_status_list: Mapped[list["DownloadStatusRow"]] = relationship(
        "DownloadStatusRow", back_populates="download", order_by="DownloadStatusRow.id"
    )

    def __init__(
        self,
        download_group_id: int,
        media_id: int,
        date_started: datetime,
        public_id: str | None = None,
        status_key: int = 1,
        seen: bool = False,
        retry_count: int = 0,
        date_ended: datetime | None = None,
        id: int | None = None,
    ) -> None:
        kwargs: dict[str, None | bool | datetime | int | str] = {}
        kwargs["download_group_id"] = download_group_id
        kwargs["media_id"] = media_id
        kwargs["date_started"] = date_started
        if public_id is not None:
            kwargs["public_id"] = public_id
        kwargs["status_key"] = status_key
        kwargs["seen"] = seen
        kwargs["retry_count"] = retry_count
        kwargs["date_ended"] = date_ended
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
