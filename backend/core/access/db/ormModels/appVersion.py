from typing import Dict

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
)


class AppVersionRow(CoreBase, TableAutoincrementId, TableDateAdded, TableDateUpdated):
    __tablename__ = "app_version"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    version: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    apk_filename: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    downloads: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    def __init__(
        self,
        version: str,
        apk_filename: str,
        description: str | None = None,
        downloads: int = 0,
    ):
        kwargs: Dict[str, None | int | str] = {}
        kwargs["version"] = version
        kwargs["apk_filename"] = apk_filename
        kwargs["description"] = description
        kwargs["downloads"] = downloads
        for k, v in kwargs.items():
            setattr(self, k, v)
