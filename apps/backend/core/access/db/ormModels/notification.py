from datetime import datetime

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
    TablePublicId,
    TZAwareTimestamp,
)


class NotificationRow(
    CoreBase, TableAutoincrementId, TablePublicId, TableDateAdded, TableDateUpdated
):
    __tablename__ = "notification"
    __table_args__ = (
        Index("notification_user_date_idx", "user_id", "date_added", "id"),
        {"schema": "core"},
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("core.user.id", ondelete="CASCADE"), nullable=False
    )
    event_key: Mapped[str] = mapped_column(String, nullable=False)
    vocabulary_key: Mapped[str] = mapped_column(String, nullable=False)
    replacements: Mapped[list[dict[str, str]]] = mapped_column(JSONB, nullable=False)
    destination: Mapped[dict[str, str] | None] = mapped_column(JSONB, nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(TZAwareTimestamp, nullable=True)
