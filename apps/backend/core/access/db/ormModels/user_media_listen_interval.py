from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.access.db.base import CoreBase
from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
)

if TYPE_CHECKING:
    from core.access.db.ormModels.media import CoreMediaRow


class UserMediaListenIntervalRow(CoreBase, TableAutoincrementId, TableDateAdded, TableDateUpdated):
    __tablename__ = "user_media_listen_interval"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.user.id"), nullable=False)
    media_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.media.id"), nullable=False)
    time_ms_start: Mapped[int] = mapped_column(Integer, nullable=False)
    time_ms_end: Mapped[int] = mapped_column(Integer, nullable=False)

    media: Mapped["CoreMediaRow"] = relationship("CoreMediaRow")

    def __init__(
        self,
        user_id: int,
        media_id: int,
        time_ms_start: int,
        time_ms_end: int,
        id: int | None = None,
    ) -> None:
        kwargs: dict[str, None | int] = {}
        kwargs["user_id"] = user_id
        kwargs["media_id"] = media_id
        kwargs["time_ms_start"] = time_ms_start
        kwargs["time_ms_end"] = time_ms_end
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
