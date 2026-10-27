from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.access.db.base import CoreBase
from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
)

if TYPE_CHECKING:
    from core.access.db.ormModels.media import CoreMediaRow


class UserMediaListenedRow(CoreBase, TableAutoincrementId, TableDateAdded):
    __tablename__ = "user_media_listened"
    __table_args__ = (
        UniqueConstraint("user_id", "date_added", name="uq_user_media_listened_user_date"),
        Index("ix_user_media_listened_media_id", "media_id"),
        {"schema": "core", "extend_existing": True},
    )

    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.user.id"), nullable=False)
    media_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.media.id"), nullable=False)

    media: Mapped["CoreMediaRow"] = relationship("CoreMediaRow")

    def __init__(self, user_id: int, media_id: int, id: int | None = None) -> None:
        kwargs: dict[str, None | int] = {}
        kwargs["user_id"] = user_id
        kwargs["media_id"] = media_id
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
