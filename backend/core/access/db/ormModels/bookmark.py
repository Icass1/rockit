from typing import TYPE_CHECKING, Dict

from sqlalchemy import DOUBLE_PRECISION, ForeignKey, Integer, String
from sqlalchemy.orm import mapped_column, relationship, Mapped

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
    TablePublicId,
)

if TYPE_CHECKING:
    from backend.core.access.db.ormModels.media import CoreMediaRow
    from backend.core.access.db.ormEnums.bookmarkModeEnum import BookmarkModeEnumRow


class BookmarkRow(
    CoreBase, TableAutoincrementId, TablePublicId, TableDateUpdated, TableDateAdded
):
    __tablename__ = "bookmark"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id"), nullable=False
    )
    media_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.media.id"), nullable=False
    )
    timestamp: Mapped[float] = mapped_column(DOUBLE_PRECISION, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    mode_key: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.bookmark_mode_enum.key"), nullable=False, default=1
    )

    media: Mapped["CoreMediaRow"] = relationship("CoreMediaRow", lazy="selectin")
    bookmark_mode_enum: Mapped["BookmarkModeEnumRow"] = relationship(
        "BookmarkModeEnumRow", lazy="selectin"
    )

    def __init__(
        self,
        public_id: str,
        user_id: int,
        media_id: int,
        timestamp: float,
        description: str | None = None,
        mode_key: int = 1,
    ):
        kwargs: Dict[str, None | float | int | str] = {}
        kwargs["public_id"] = public_id
        kwargs["user_id"] = user_id
        kwargs["media_id"] = media_id
        kwargs["timestamp"] = timestamp
        kwargs["description"] = description
        kwargs["mode_key"] = mode_key
        for k, v in kwargs.items():
            setattr(self, k, v)
