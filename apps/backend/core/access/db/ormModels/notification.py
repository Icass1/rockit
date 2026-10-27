from sqlalchemy import Boolean, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from core.access.db.base import CoreBase
from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
    TablePublicId,
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
        user_id: int,
        event_key: str,
        type: int,
        category: str,
        message: str,
        public_id: str | None = None,
        message_key: str | None = None,
        detail: str | None = None,
        detail_key: str | None = None,
        read: bool = False,
        id: int | None = None,
    ) -> None:
        kwargs: dict[str, None | bool | int | str] = {}
        kwargs["user_id"] = user_id
        kwargs["event_key"] = event_key
        kwargs["type"] = type
        kwargs["category"] = category
        kwargs["message"] = message
        if public_id is not None:
            kwargs["public_id"] = public_id
        kwargs["message_key"] = message_key
        kwargs["detail"] = detail
        kwargs["detail_key"] = detail_key
        kwargs["read"] = read
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
