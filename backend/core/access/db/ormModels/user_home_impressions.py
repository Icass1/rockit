from typing import Dict

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import mapped_column, Mapped

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableAutoincrementId,
)


class UserHomeImpressionsRow(CoreBase, TableAutoincrementId, TableDateAdded):
    __tablename__ = "user_home_impressions"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "media_id", "section", name="uq_user_home_impressions"
        ),
        {"schema": "core", "extend_existing": True},
    )

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id"), nullable=False
    )
    media_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.media.id"), nullable=False
    )
    section: Mapped[str] = mapped_column(String(32), nullable=False)

    def __init__(self, user_id: int, media_id: int, section: str):
        kwargs: Dict[str, int | str] = {}
        kwargs["user_id"] = user_id
        kwargs["media_id"] = media_id
        kwargs["section"] = section
        for k, v in kwargs.items():
            setattr(self, k, v)
