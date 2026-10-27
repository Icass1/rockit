from typing import Dict
from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from core.access.db.base import CoreBase
from core.access.db.ormModels.declarativeMixin import TableDateAdded


class ListeningXpEventRow(CoreBase, TableDateAdded):
    __tablename__ = "listening_xp_event"
    __table_args__ = {"schema": "core", "extend_existing": True}
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id"), primary_key=True
    )
    event_key: Mapped[str] = mapped_column(String(80), primary_key=True)
    xp: Mapped[int] = mapped_column(Integer, nullable=False)

    def __init__(self, user_id: int, event_key: str, xp: int):
        kwargs: Dict[str, int | str] = {}
        kwargs["user_id"] = user_id
        kwargs["event_key"] = event_key
        kwargs["xp"] = xp
        for k, v in kwargs.items():
            setattr(self, k, v)
