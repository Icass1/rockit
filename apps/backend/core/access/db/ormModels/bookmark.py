from typing import TYPE_CHECKING

from sqlalchemy import DOUBLE_PRECISION, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.access.db.base import CoreBase
from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
    TablePublicId,
)

if TYPE_CHECKING:
    from core.access.db.ormEnums.bookmarkModeEnum import BookmarkModeEnumRow
    from core.access.db.ormModels.media import CoreMediaRow


class BookmarkRow(CoreBase, TableAutoincrementId, TablePublicId, TableDateUpdated, TableDateAdded):
    __tablename__ = "bookmark"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.user.id"), nullable=False)
    media_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.media.id"), nullable=False)
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
        user_id: int,
        media_id: int,
        timestamp: float,
        public_id: str | None = None,
        description: str | None = None,
        mode_key: int = 1,
        id: int | None = None,
    ) -> None:
        kwargs: dict[str, None | float | int | str] = {}
        kwargs["user_id"] = user_id
        kwargs["media_id"] = media_id
        kwargs["timestamp"] = timestamp
        if public_id is not None:
            kwargs["public_id"] = public_id
        kwargs["description"] = description
        kwargs["mode_key"] = mode_key
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
