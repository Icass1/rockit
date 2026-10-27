from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from core.access.db.base import CoreBase
from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
    TablePublicId,
)


class ImageRow(CoreBase, TableAutoincrementId, TablePublicId, TableDateUpdated, TableDateAdded):
    __tablename__ = "image"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    url: Mapped[str | None] = mapped_column(String, nullable=True)
    path: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    dominant_color: Mapped[str] = mapped_column(String, nullable=False)

    def __init__(
        self,
        path: str,
        dominant_color: str,
        public_id: str | None = None,
        url: str | None = None,
        id: int | None = None,
    ) -> None:
        kwargs: dict[str, None | int | str] = {}
        kwargs["path"] = path
        kwargs["dominant_color"] = dominant_color
        if public_id is not None:
            kwargs["public_id"] = public_id
        kwargs["url"] = url
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
