from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.access.db.base import CoreBase
from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
)

if TYPE_CHECKING:
    from core.access.db.ormModels.user import UserRow


class RequestLogRow(CoreBase, TableAutoincrementId, TableDateAdded):
    __tablename__ = "request_log"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("core.user.id"), nullable=True)
    route: Mapped[str] = mapped_column(String, nullable=False)
    ip: Mapped[str | None] = mapped_column(INET, nullable=True)
    method: Mapped[str] = mapped_column(String, nullable=False)
    response_code: Mapped[int] = mapped_column(Integer, nullable=False)
    time_taken_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    timestamp: Mapped[str] = mapped_column(String, nullable=False)

    user: Mapped["UserRow | None"] = relationship(
        "UserRow", back_populates="request_logs", foreign_keys=[user_id]
    )

    def __init__(
        self,
        route: str,
        method: str,
        response_code: int,
        time_taken_ms: int,
        timestamp: str,
        user_id: int | None = None,
        ip: str | None = None,
        id: int | None = None,
    ) -> None:
        kwargs: dict[str, None | int | str] = {}
        kwargs["route"] = route
        kwargs["method"] = method
        kwargs["response_code"] = response_code
        kwargs["time_taken_ms"] = time_taken_ms
        kwargs["timestamp"] = timestamp
        kwargs["user_id"] = user_id
        kwargs["ip"] = ip
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
