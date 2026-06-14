from sqlalchemy import Integer, String
from sqlalchemy.orm import mapped_column, Mapped

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
)


class LevelConfigRow(CoreBase, TableAutoincrementId):
    __tablename__ = "level_config"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    level: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)
    xp_required: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
