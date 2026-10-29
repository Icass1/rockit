from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from core.access.db.base import CoreBase
from core.access.db.ormModels.declarativeMixin import TableDateAdded


class UserNavigationListPinRow(CoreBase, TableDateAdded):
    """Personal references to dynamic Rockit lists; no media or playlist is created."""

    __tablename__ = "user_navigation_list_pin"
    __table_args__ = {"schema": "core", "extend_existing": True}

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id", ondelete="CASCADE"), primary_key=True
    )
    list_key: Mapped[str] = mapped_column(String(64), primary_key=True)

    def __init__(self, user_id: int, list_key: str) -> None:
        kwargs: dict[str, int | str] = {}
        kwargs["user_id"] = user_id
        kwargs["list_key"] = list_key
        for k, v in kwargs.items():
            setattr(self, k, v)
