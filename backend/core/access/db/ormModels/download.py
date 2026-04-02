from typing import TYPE_CHECKING, Dict, List

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
)

if TYPE_CHECKING:
    from backend.core.access.db.ormModels.downloadGroup import DownloadGroupRow
    from backend.core.access.db.ormModels.downloadStatus import DownloadStatusRow


class DownloadRow(CoreBase, TableAutoincrementId, TableDateUpdated, TableDateAdded):
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

    download_group: Mapped["DownloadGroupRow"] = relationship(
        "DownloadGroupRow", back_populates="downloads"
    )
    download_status_list: Mapped[List["DownloadStatusRow"]] = relationship(
        "DownloadStatusRow", back_populates="download", order_by="DownloadStatusRow.id"
    )

    def __init__(self, download_group_id: int, media_id: int, status_key: int = 1):
        kwargs: Dict[str, int] = {}
        kwargs["download_group_id"] = download_group_id
        kwargs["media_id"] = media_id
        kwargs["status_key"] = status_key
        for k, v in kwargs.items():
            setattr(self, k, v)
