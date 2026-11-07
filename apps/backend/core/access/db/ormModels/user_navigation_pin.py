from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from core.access.db.base import CoreBase
from core.access.db.ormModels.declarativeMixin import TableDateAdded


class UserNavigationPinRow(CoreBase, TableDateAdded):
    """Personal navigation references, independent of Library membership."""

    __tablename__ = "user_navigation_pin"
    __table_args__ = {"schema": "core", "extend_existing": True}

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id", ondelete="CASCADE"), primary_key=True
    )
    media_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.media.id", ondelete="CASCADE"), primary_key=True
    )

    def __init__(self, user_id: int, media_id: int) -> None:
        kwargs: dict[str, int] = {}
        kwargs["user_id"] = user_id
        kwargs["media_id"] = media_id
        for k, v in kwargs.items():
            setattr(self, k, v)
