from typing import TYPE_CHECKING, Dict

from sqlalchemy import Boolean, ForeignKey, Integer, Text
from sqlalchemy.orm import mapped_column, relationship, Mapped

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
    TablePublicId,
)
from backend.core.enums.friend.listenTogetherStatusEnum import ListenTogetherStatusEnum

if TYPE_CHECKING:
    from backend.core.access.db.ormModels.user import UserRow
    from backend.core.access.db.ormModels.media import CoreMediaRow


class ListenTogetherSessionRow(
    CoreBase, TableAutoincrementId, TablePublicId, TableDateUpdated, TableDateAdded
):
    __tablename__ = "listen_together_session"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    host_user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id"), nullable=False
    )
    guest_user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id"), nullable=False
    )
    current_media_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("core.media.id"), nullable=True
    )
    current_time_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_playing: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    queue_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    status_key: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("core.listen_together_status_enum.key"),
        nullable=False,
        default=1,
    )

    host: Mapped["UserRow"] = relationship(
        "UserRow", foreign_keys=[host_user_id], lazy="selectin"
    )
    guest: Mapped["UserRow"] = relationship(
        "UserRow", foreign_keys=[guest_user_id], lazy="selectin"
    )
    current_media: Mapped["CoreMediaRow | None"] = relationship(
        "CoreMediaRow", lazy="selectin"
    )

    @property
    def status(self) -> ListenTogetherStatusEnum:
        return ListenTogetherStatusEnum(self.status_key)

    @status.setter
    def status(self, value: ListenTogetherStatusEnum) -> None:
        self.status_key = value.value

    def __init__(
        self,
        public_id: str,
        host_user_id: int,
        guest_user_id: int,
        current_media_id: int | None = None,
        current_time_ms: int = 0,
        is_playing: bool = False,
        queue_json: str | None = None,
        status_key: int = 1,
    ):
        kwargs: Dict[str, int | str | bool | None] = {}
        kwargs["public_id"] = public_id
        kwargs["host_user_id"] = host_user_id
        kwargs["guest_user_id"] = guest_user_id
        kwargs["current_media_id"] = current_media_id
        kwargs["current_time_ms"] = current_time_ms
        kwargs["is_playing"] = is_playing
        kwargs["queue_json"] = queue_json
        kwargs["status_key"] = status_key
        for k, v in kwargs.items():
            setattr(self, k, v)
