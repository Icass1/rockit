from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from core.access.db.base import CoreBase


class NotificationSubscriptionRow(CoreBase):
    __tablename__ = "notification_subscription"
    __table_args__ = (
        Index("notification_subscription_event_idx", "event_key"),
        {"schema": "core"},
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("core.user.id", ondelete="CASCADE"), primary_key=True
    )
    event_key: Mapped[str] = mapped_column(String, primary_key=True)

    def __init__(self, user_id: int, event_key: str) -> None:
        kwargs: dict[str, int | str] = {}
        kwargs["user_id"] = user_id
        kwargs["event_key"] = event_key
        for k, v in kwargs.items():
            setattr(self, k, v)
