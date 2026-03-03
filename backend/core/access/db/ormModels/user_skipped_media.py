from typing import TYPE_CHECKING, Dict

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import mapped_column, relationship, Mapped

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableAutoincrementId,
)

if TYPE_CHECKING:
    from backend.core.access.db.ormModels.media import CoreMediaRow
    from backend.core.access.db.ormEnums.skipDirectionEnum import SkipDirectionEnumRow


class UserSkippedMediaRow(CoreBase, TableAutoincrementId, TableDateAdded):
    __tablename__ = "user_skipped_media"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id"), nullable=False
    )
    media_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.media.id"), nullable=False
    )
    skip_direction_key: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.skip_direction_enum.key"), nullable=False
    )

    media: Mapped["CoreMediaRow"] = relationship("CoreMediaRow")
    skip_direction_enum: Mapped["SkipDirectionEnumRow"] = relationship(
        "SkipDirectionEnumRow"
    )

    def __init__(self, user_id: int, media_id: int, skip_direction_key: int):
        kwargs: Dict[str, int] = {}
        kwargs["user_id"] = user_id
        kwargs["media_id"] = media_id
        kwargs["skip_direction_key"] = skip_direction_key
        for k, v in kwargs.items():
            setattr(self, k, v)
