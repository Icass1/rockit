from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.access.db.base import CoreBase
from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
)

if TYPE_CHECKING:
    from core.access.db.ormModels.media import CoreMediaRow
    from core.access.db.ormModels.user import UserRow


class UserQueueRow(CoreBase, TableAutoincrementId, TableDateAdded):
    __tablename__ = "user_queue"
    __table_args__ = (
        UniqueConstraint("user_id", "queue_id"),
        UniqueConstraint("user_id", "sorted_index"),
        UniqueConstraint("user_id", "random_index"),
        {"schema": "core", "extend_existing": True},
    )

    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.user.id"), nullable=False)
    media_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.media.id"), nullable=False)
    list_media_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("core.media.id"), nullable=True
    )
    queue_id: Mapped[int] = mapped_column(Integer, nullable=False)
    sorted_index: Mapped[int] = mapped_column(Integer, nullable=False)
    random_index: Mapped[int] = mapped_column(Integer, nullable=False)

    user: Mapped["UserRow"] = relationship("UserRow", back_populates="user_queues")
    media: Mapped["CoreMediaRow"] = relationship("CoreMediaRow", foreign_keys=[media_id])

    def __init__(
        self,
        user_id: int,
        media_id: int,
        queue_id: int,
        sorted_index: int,
        random_index: int,
        list_media_id: int | None = None,
        id: int | None = None,
    ) -> None:
        kwargs: dict[str, None | int] = {}
        kwargs["user_id"] = user_id
        kwargs["media_id"] = media_id
        kwargs["queue_id"] = queue_id
        kwargs["sorted_index"] = sorted_index
        kwargs["random_index"] = random_index
        kwargs["list_media_id"] = list_media_id
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
