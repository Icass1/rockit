from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.access.db.base import CoreBase
from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
    TZAwareTimestamp,
)

if TYPE_CHECKING:
    from core.access.db.ormModels.user import UserRow


class SessionRow(CoreBase, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = "session"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    session_id: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.user.id"), nullable=False)
    disabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    expires_at: Mapped[datetime] = mapped_column(TZAwareTimestamp, nullable=False, unique=True)
    ip: Mapped[str | None] = mapped_column(INET, nullable=True)

    user: Mapped["UserRow"] = relationship(
        "UserRow", back_populates="sessions", foreign_keys=[user_id]
    )

    platform_key: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.platform_enum.key"), nullable=False
    )

    def __init__(
        self,
        session_id: str,
        user_id: int,
        expires_at: datetime,
        platform_key: int,
        disabled: bool = False,
        ip: str | None = None,
        id: int | None = None,
    ) -> None:
        kwargs: dict[str, None | bool | datetime | int | str] = {}
        kwargs["session_id"] = session_id
        kwargs["user_id"] = user_id
        kwargs["expires_at"] = expires_at
        kwargs["platform_key"] = platform_key
        kwargs["disabled"] = disabled
        kwargs["ip"] = ip
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
