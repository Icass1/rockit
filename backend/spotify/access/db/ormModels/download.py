from datetime import datetime
from typing import TYPE_CHECKING,  Dict, List

from sqlalchemy.orm import relationship, mapped_column, Mapped
from sqlalchemy import TIMESTAMP, ForeignKey, String, Integer, Boolean

from backend.spotify.access.db.base import SpotifyBase
from backend.core.access.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId

if TYPE_CHECKING:
    from backend.spotify.access.db.ormModels.downloadStatus import DownloadStatusRow


class DownloadRow(SpotifyBase, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'download'
    __table_args__ = {'schema': 'spotify', 'extend_existing': True},

    public_id: Mapped[str] = mapped_column(String, nullable=False)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey('core.user.id'),
        nullable=False)
    date_started: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False)
    date_ended: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True)
    download_url: Mapped[str] = mapped_column(String, nullable=False)
    download_status_key: Mapped[int] = mapped_column(
        Integer,
        ForeignKey('spotify.download_status_enum.key'),
        nullable=False,
        default=1)
    seen: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    success: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fail: Mapped[int | None] = mapped_column(Integer, nullable=True)

    download_status_history: Mapped[List["DownloadStatusRow"]] = relationship(
        "DownloadStatusRow", back_populates="download")

    def __init__(self, public_id: str, user_id: int, date_started: datetime, download_url: str, date_ended: datetime | None = None, download_status_key: int = 1, seen: bool = False, success: int | None = None, fail: int | None = None):
        kwargs: Dict[str, None | bool | datetime | int | str] = {}
        kwargs['public_id'] = public_id
        kwargs['user_id'] = user_id
        kwargs['date_started'] = date_started
        kwargs['download_url'] = download_url
        kwargs['date_ended'] = date_ended
        kwargs['download_status_key'] = download_status_key
        kwargs['seen'] = seen
        kwargs['success'] = success
        kwargs['fail'] = fail
        for k, v in kwargs.items():
            setattr(self, k, v)
