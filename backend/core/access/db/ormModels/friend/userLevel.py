from typing import Dict

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import mapped_column, Mapped

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
)


class UserLevelRow(
    CoreBase, TableAutoincrementId, TableDateUpdated, TableDateAdded
):
    __tablename__ = "user_level"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id"), nullable=False, unique=True
    )
    xp: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    level: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    def __init__(
        self,
        user_id: int,
        xp: int = 0,
        level: int = 1,
    ):
        kwargs: Dict[str, int] = {}
        kwargs["user_id"] = user_id
        kwargs["xp"] = xp
        kwargs["level"] = level
        for k, v in kwargs.items():
            setattr(self, k, v)


class LevelConfigRow(CoreBase, TableAutoincrementId):
    __tablename__ = "level_config"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    level: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)
    xp_required: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)

    def __init__(
        self,
        level: int,
        xp_required: int,
        title: str,
    ):
        kwargs: Dict[str, int | str] = {}
        kwargs["level"] = level
        kwargs["xp_required"] = xp_required
        kwargs["title"] = title
        for k, v in kwargs.items():
            setattr(self, k, v)
