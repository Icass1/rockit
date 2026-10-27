from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.access.db.base import CoreBase
from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
)

if TYPE_CHECKING:
    from core.access.db.ormModels.media import CoreMediaRow
    from core.access.db.ormModels.user import UserRow


class UserLibraryMediaRow(CoreBase, TableAutoincrementId, TableDateAdded):
    __tablename__ = "user_library_media"
    __table_args__ = (
        UniqueConstraint("user_id", "media_id", name="uq_user_library_media"),
        {"schema": "core", "extend_existing": True},
    )

    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.user.id"), nullable=False)

    media_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.media.id"), nullable=False)

    user: Mapped["UserRow"] = relationship(
        "UserRow",
        back_populates="user_library_medias",
    )
    media: Mapped["CoreMediaRow"] = relationship(
        "CoreMediaRow",
        back_populates="user_library_medias",
    )

    def __init__(self, user_id: int, media_id: int, id: int | None = None) -> None:
        kwargs: dict[str, None | int] = {}
        kwargs["user_id"] = user_id
        kwargs["media_id"] = media_id
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
