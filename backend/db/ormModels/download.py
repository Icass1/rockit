from datetime import datetime
from typing import TYPE_CHECKING, Literal, Final

from sqlalchemy.orm import relationship, mapped_column, Mapped
from sqlalchemy import ForeignKey, String, Integer, DateTime, Enum, Boolean

from backend.db.base import Base
from backend.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId

if TYPE_CHECKING:
    from backend.db.ormModels.user import UserRow


DOWNLOAD_STATUSES: Final[tuple[str, ...]] = (
    "pending",
    "in_progress",
    "completed",
    "failed",
    "fetching",
    "waiting_for_queue_setup",
    "waiting_for_songs"
)

STATUS_TYPE = Literal[
    "pending",
    "in_progress",
    "completed",
    "failed",
    "fetching",
    "waiting_for_queue_setup",
    "waiting_for_songs"
]


class DownloadRow(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'downloads'
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    public_id: Mapped[str] = mapped_column(String, nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey(
        'main.users.id'), nullable=False)
    date_started: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), nullable=False)
    date_ended: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=False), nullable=True)
    download_url: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[STATUS_TYPE] = mapped_column(Enum(
        *DOWNLOAD_STATUSES, name="download_status_enum", schema="main"), nullable=False, default="pending")
    seen: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    success: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fail: Mapped[int | None] = mapped_column(Integer, nullable=True)

    user: Mapped["UserRow"] = relationship("UserRow", back_populates="downloads",
                                           foreign_keys=[user_id])

    def __init__(self, public_id: str, user_id: int, date_started: datetime, download_url: str, date_ended: datetime | None = None, status: STATUS_TYPE = "pending", seen: bool = False, success: int | None = None, fail: int | None = None):
        kwargs = {}
        kwargs['public_id'] = public_id
        kwargs['user_id'] = user_id
        kwargs['date_started'] = date_started
        kwargs['download_url'] = download_url
        kwargs['date_ended'] = date_ended
        kwargs['status'] = status
        kwargs['seen'] = seen
        kwargs['success'] = success
        kwargs['fail'] = fail
        for k, v in kwargs.items():
            setattr(self, k, v)
