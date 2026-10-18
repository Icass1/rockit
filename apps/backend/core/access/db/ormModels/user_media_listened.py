from typing import TYPE_CHECKING, Dict

from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import mapped_column, relationship, Mapped

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableAutoincrementId,
)

if TYPE_CHECKING:
    from backend.core.access.db.ormModels.media import CoreMediaRow


class UserMediaListenedRow(CoreBase, TableAutoincrementId, TableDateAdded):
    __tablename__ = "user_media_listened"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "date_added", name="uq_user_media_listened_user_date"
        ),
        {"schema": "core", "extend_existing": True},
    )

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id"), nullable=False
    )
    media_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.media.id"), nullable=False
    )

    media: Mapped["CoreMediaRow"] = relationship("CoreMediaRow")

    def __init__(self, user_id: int, media_id: int):
        kwargs: Dict[str, int] = {}
        kwargs["user_id"] = user_id
        kwargs["media_id"] = media_id
        for k, v in kwargs.items():
            setattr(self, k, v)
