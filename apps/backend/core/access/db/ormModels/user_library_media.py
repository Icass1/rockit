from typing import TYPE_CHECKING, Dict

from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import mapped_column, Mapped, relationship

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableAutoincrementId,
)

if TYPE_CHECKING:
    from backend.core.access.db.ormModels.user import UserRow
    from backend.core.access.db.ormModels.media import CoreMediaRow


class UserLibraryMediaRow(CoreBase, TableAutoincrementId, TableDateAdded):
    __tablename__ = "user_library_media"
    __table_args__ = (
        UniqueConstraint("user_id", "media_id", name="uq_user_library_media"),
        {"schema": "core", "extend_existing": True},
    )

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id"), nullable=False
    )

    media_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.media.id"), nullable=False
    )

    user: Mapped["UserRow"] = relationship(
        "UserRow",
        back_populates="user_library_medias",
    )
    media: Mapped["CoreMediaRow"] = relationship(
        "CoreMediaRow",
        back_populates="user_library_medias",
    )

    def __init__(self, user_id: int, media_id: int):
        kwargs: Dict[str, int] = {}
        kwargs["user_id"] = user_id
        kwargs["media_id"] = media_id
        for k, v in kwargs.items():
            setattr(self, k, v)
