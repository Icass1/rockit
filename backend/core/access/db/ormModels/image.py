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

    url: Mapped[str] = mapped_column(String, nullable=False)
    path: Mapped[str] = mapped_column(String, nullable=False, unique=True)

    def __init__(self, public_id: str, url: str, path: str):
        kwargs: Dict[str, str] = {}
        kwargs["public_id"] = public_id
        kwargs["url"] = url
        kwargs["path"] = path
        for k, v in kwargs.items():
            setattr(self, k, v)
