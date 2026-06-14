from typing import TYPE_CHECKING, Dict

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import mapped_column, relationship, Mapped

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
)
from backend.core.enums.friend.friendStatusEnum import FriendStatusEnum

if TYPE_CHECKING:
    from backend.core.access.db.ormModels.user import UserRow


class FriendRow(CoreBase, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = "user_friend"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id"), nullable=False
    )
    friend_user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id"), nullable=False
    )
    status_key: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.friend_status_enum.key"), nullable=False, default=1
    )

    user: Mapped["UserRow"] = relationship(
        "UserRow", foreign_keys=[user_id], lazy="selectin"
    )
    friend: Mapped["UserRow"] = relationship(
        "UserRow", foreign_keys=[friend_user_id], lazy="selectin"
    )

    @property
    def status(self) -> FriendStatusEnum:
        return FriendStatusEnum(self.status_key)

    @status.setter
    def status(self, value: FriendStatusEnum) -> None:
        self.status_key = value.value

    def __init__(
        self,
        user_id: int,
        friend_user_id: int,
        status_key: int = 1,
    ):
        kwargs: Dict[str, int] = {}
        kwargs["user_id"] = user_id
        kwargs["friend_user_id"] = friend_user_id
        kwargs["status_key"] = status_key
        for k, v in kwargs.items():
            setattr(self, k, v)
