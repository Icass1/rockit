from typing import TYPE_CHECKING, Dict

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import mapped_column, relationship, Mapped

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TablePublicId,
    TableDateUpdated,
)

if TYPE_CHECKING:
    from backend.core.access.db.ormModels.user import UserRow


class FriendRequestRow(
    CoreBase, TableAutoincrementId, TablePublicId, TableDateUpdated, TableDateAdded
):
    __tablename__ = "friend_request"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    from_user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id"), nullable=False
    )
    to_user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id"), nullable=False
    )
    status_key: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.friend_status_enum.key"), nullable=False, default=1
    )
    message: Mapped[str | None] = mapped_column(Text, nullable=True)

    from_user: Mapped["UserRow"] = relationship(
        "UserRow", foreign_keys=[from_user_id], lazy="selectin"
    )
    to_user: Mapped["UserRow"] = relationship(
        "UserRow", foreign_keys=[to_user_id], lazy="selectin"
    )

    def __init__(
        self,
        public_id: str,
        from_user_id: int,
        to_user_id: int,
        status_key: int = 1,
        message: str | None = None,
    ):
        kwargs: Dict[str, int | str | None] = {}
        kwargs["public_id"] = public_id
        kwargs["from_user_id"] = from_user_id
        kwargs["to_user_id"] = to_user_id
        kwargs["status_key"] = status_key
        kwargs["message"] = message
        for k, v in kwargs.items():
            setattr(self, k, v)
