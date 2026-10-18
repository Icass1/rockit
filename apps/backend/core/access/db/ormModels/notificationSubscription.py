from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.core.access.db.base import CoreBase


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
