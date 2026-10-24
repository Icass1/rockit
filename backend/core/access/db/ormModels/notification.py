from typing import Dict
from sqlalchemy import Boolean, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TablePublicId,
    TableDateAdded,
    TableDateUpdated,
)


class NotificationRow(
    CoreBase, TableAutoincrementId, TablePublicId, TableDateUpdated, TableDateAdded
):
    __tablename__ = "notification"
    __table_args__ = (
        UniqueConstraint("user_id", "event_key", name="uq_notification_user_event"),
        Index("ix_notification_user_history", "user_id", "date_added", "id"),
        {"schema": "core", "extend_existing": True},
    )

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id", ondelete="CASCADE"), nullable=False
    )
    event_key: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped[str] = mapped_column(String(20), nullable=False)
    message: Mapped[str] = mapped_column(String(2000), nullable=False)
    message_key: Mapped[str | None] = mapped_column(String(100), nullable=True)
    detail: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    detail_key: Mapped[str | None] = mapped_column(String(100), nullable=True)
    read: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )

    def __init__(
        self,
        public_id: str,
        user_id: int,
        event_key: str,
        type: int,
        category: str,
        message: str,
        message_key: str | None = None,
        detail: str | None = None,
        detail_key: str | None = None,
        read: bool = False,
    ):
        kwargs: Dict[str, None | bool | int | str] = {}
        kwargs["public_id"] = public_id
        kwargs["user_id"] = user_id
        kwargs["event_key"] = event_key
        kwargs["type"] = type
        kwargs["category"] = category
        kwargs["message"] = message
        kwargs["message_key"] = message_key
        kwargs["detail"] = detail
        kwargs["detail_key"] = detail_key
        kwargs["read"] = read
        for k, v in kwargs.items():
            setattr(self, k, v)
