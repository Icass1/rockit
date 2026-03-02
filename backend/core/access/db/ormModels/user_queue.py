from typing import TYPE_CHECKING, Dict

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import mapped_column, relationship, Mapped

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableAutoincrementId,
)

if TYPE_CHECKING:
    from backend.core.access.db.ormModels.user import UserRow
    from backend.core.access.db.ormModels.media import CoreMediaRow
    from backend.core.access.db.ormEnums.queueTypeEnum import QueueTypeEnumRow


class UserQueueRow(CoreBase, TableAutoincrementId, TableDateAdded):
    __tablename__ = "user_queue"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id"), nullable=False
    )
    media_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.media.id"), nullable=False
    )
    queue_index: Mapped[int] = mapped_column(Integer, nullable=False)
    queue_type_key: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.queue_type_enum.key"), nullable=False
    )

    user: Mapped["UserRow"] = relationship("UserRow", back_populates="user_queues")
    media: Mapped["CoreMediaRow"] = relationship("CoreMediaRow")
    queue_type_enum: Mapped["QueueTypeEnumRow"] = relationship("QueueTypeEnumRow")

    def __init__(
        self, user_id: int, media_id: int, queue_index: int, queue_type_key: int
    ):
        kwargs: Dict[str, int] = {}
        kwargs["user_id"] = user_id
        kwargs["media_id"] = media_id
        kwargs["queue_index"] = queue_index
        kwargs["queue_type_key"] = queue_type_key
        for k, v in kwargs.items():
            setattr(self, k, v)
