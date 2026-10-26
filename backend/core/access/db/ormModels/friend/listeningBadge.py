from datetime import datetime
from typing import Dict
from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import TableDateAdded


class ListeningBadgeRow(CoreBase, TableDateAdded):
    __tablename__ = "listening_badge"
    __table_args__ = {"schema": "core", "extend_existing": True}
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id"), primary_key=True
    )
    badge_key: Mapped[str] = mapped_column(String(40), primary_key=True)

    def __init__(self, user_id: int, badge_key: str):
        kwargs: Dict[str, int | str] = {}
        kwargs["user_id"] = user_id
        kwargs["badge_key"] = badge_key
        for k, v in kwargs.items():
            setattr(self, k, v)
