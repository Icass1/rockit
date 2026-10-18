from typing import TYPE_CHECKING, Dict

from sqlalchemy import DOUBLE_PRECISION, ForeignKey, Integer
from sqlalchemy.orm import mapped_column, relationship, Mapped

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableAutoincrementId,
)

if TYPE_CHECKING:
    from backend.core.access.db.ormModels.media import CoreMediaRow


class UserSeeksRow(CoreBase, TableAutoincrementId, TableDateAdded):
    __tablename__ = "user_seeks"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id"), nullable=False
    )
    media_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.media.id"), nullable=False
    )
    time_from: Mapped[float] = mapped_column(DOUBLE_PRECISION, nullable=False)
    time_to: Mapped[float] = mapped_column(DOUBLE_PRECISION, nullable=False)

    media: Mapped["CoreMediaRow"] = relationship("CoreMediaRow")

    def __init__(self, user_id: int, media_id: int, time_from: float, time_to: float):
        kwargs: Dict[str, float | int] = {}
        kwargs["user_id"] = user_id
        kwargs["media_id"] = media_id
        kwargs["time_from"] = time_from
        kwargs["time_to"] = time_to
        for k, v in kwargs.items():
            setattr(self, k, v)
