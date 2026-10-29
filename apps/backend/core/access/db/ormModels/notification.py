from datetime import datetime

from sqlalchemy import ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from core.access.db.base import CoreBase
from core.access.db.ormModels.declarativeMixin import (
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
        UniqueConstraint("user_id", "source_key", name="notification_user_source_uq"),
        Index("notification_user_date_idx", "user_id", "date_added", "id"),
        {"schema": "core"},
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("core.user.id", ondelete="CASCADE"), nullable=False
    )
    event_key: Mapped[str] = mapped_column(String, nullable=False)
    source_key: Mapped[str | None] = mapped_column(String, nullable=True)
    vocabulary_key: Mapped[str] = mapped_column(String, nullable=False)
    replacements: Mapped[list[dict[str, str]]] = mapped_column(JSONB, nullable=False)
    destination: Mapped[dict[str, str] | None] = mapped_column(JSONB, nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(TZAwareTimestamp, nullable=True)

    def __init__(
        self,
        user_id: int,
        event_key: str,
        vocabulary_key: str,
        replacements: list[dict[str, str]],
        public_id: str | None = None,
        source_key: str | None = None,
        destination: dict[str, str] | None = None,
        read_at: datetime | None = None,
        id: int | None = None,
    ) -> None:
        kwargs: dict[str, None | datetime | dict[str, str] | int | list[dict[str, str]] | str] = {}
        kwargs["user_id"] = user_id
        kwargs["event_key"] = event_key
        kwargs["vocabulary_key"] = vocabulary_key
        kwargs["replacements"] = replacements
        if public_id is not None:
            kwargs["public_id"] = public_id
        kwargs["source_key"] = source_key
        kwargs["destination"] = destination
        kwargs["read_at"] = read_at
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
