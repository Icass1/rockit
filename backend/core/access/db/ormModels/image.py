from typing import Dict

from sqlalchemy import String
from sqlalchemy.orm import mapped_column, Mapped

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
    TableAutoincrementId,
    TablePublicId,
)


class ImageRow(
    CoreBase, TableAutoincrementId, TablePublicId, TableDateUpdated, TableDateAdded
):
    __tablename__ = "image"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    url: Mapped[str | None] = mapped_column(String, nullable=True)
    path: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    dominant_color: Mapped[str | None] = mapped_column(String, nullable=True)

    def __init__(
        self,
        public_id: str,
        path: str,
        url: str | None = None,
        dominant_color: str | None = None,
    ):
        kwargs: Dict[str, None | str] = {}
        kwargs["public_id"] = public_id
        kwargs["path"] = path
        kwargs["url"] = url
        kwargs["dominant_color"] = dominant_color
        for k, v in kwargs.items():
            setattr(self, k, v)
