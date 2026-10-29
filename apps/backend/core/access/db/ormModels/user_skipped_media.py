from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.access.db.base import CoreBase
from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
)

if TYPE_CHECKING:
    from core.access.db.ormEnums.skipDirectionEnum import SkipDirectionEnumRow
    from core.access.db.ormModels.media import CoreMediaRow


class UserSkippedMediaRow(CoreBase, TableAutoincrementId, TableDateAdded):
    __tablename__ = "user_skipped_media"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.user.id"), nullable=False)
    media_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.media.id"), nullable=False)
    skip_direction_key: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.skip_direction_enum.key"), nullable=False
    )

    media: Mapped["CoreMediaRow"] = relationship("CoreMediaRow")
    skip_direction_enum: Mapped["SkipDirectionEnumRow"] = relationship("SkipDirectionEnumRow")

    def __init__(
        self, user_id: int, media_id: int, skip_direction_key: int, id: int | None = None
    ) -> None:
        kwargs: dict[str, None | int] = {}
        kwargs["user_id"] = user_id
        kwargs["media_id"] = media_id
        kwargs["skip_direction_key"] = skip_direction_key
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
