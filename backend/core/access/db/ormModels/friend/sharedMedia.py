from typing import TYPE_CHECKING, Dict

from sqlalchemy import Boolean, ForeignKey, Integer, Text
from sqlalchemy.orm import mapped_column, relationship, Mapped

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TablePublicId,
)

if TYPE_CHECKING:
    from backend.core.access.db.ormModels.user import UserRow
    from backend.core.access.db.ormModels.media import CoreMediaRow


class SharedMediaRow(
    CoreBase, TableAutoincrementId, TablePublicId, TableDateAdded
):
    __tablename__ = "shared_media"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    sender_user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id"), nullable=False
    )
    recipient_user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id"), nullable=False
    )
    media_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.media.id"), nullable=False
    )
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    seen: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    sender: Mapped["UserRow"] = relationship(
        "UserRow", foreign_keys=[sender_user_id], lazy="selectin"
    )
    recipient: Mapped["UserRow"] = relationship(
        "UserRow", foreign_keys=[recipient_user_id], lazy="selectin"
    )
    media: Mapped["CoreMediaRow"] = relationship("CoreMediaRow", lazy="selectin")

    def __init__(
        self,
        public_id: str,
        sender_user_id: int,
        recipient_user_id: int,
        media_id: int,
        message: str | None = None,
        seen: bool = False,
    ):
        kwargs: Dict[str, int | str | bool | None] = {}
        kwargs["public_id"] = public_id
        kwargs["sender_user_id"] = sender_user_id
        kwargs["recipient_user_id"] = recipient_user_id
        kwargs["media_id"] = media_id
        kwargs["message"] = message
        kwargs["seen"] = seen
        for k, v in kwargs.items():
            setattr(self, k, v)
