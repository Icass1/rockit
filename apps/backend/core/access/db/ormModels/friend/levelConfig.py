from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from core.access.db.base import CoreBase
from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
)


class LevelConfigRow(CoreBase, TableAutoincrementId):
    __tablename__ = "level_config"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    level: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)
    xp_required: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)

    def __init__(self, level: int, xp_required: int, title: str) -> None:
        kwargs: dict[str, int | str] = {}
        kwargs["level"] = level
        kwargs["xp_required"] = xp_required
        kwargs["title"] = title
        for k, v in kwargs.items():
            setattr(self, k, v)
