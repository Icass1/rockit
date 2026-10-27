from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from core.access.db.base import CoreBase
from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
    TablePublicId,
)


class AppVersionRow(
    CoreBase, TableAutoincrementId, TablePublicId, TableDateAdded, TableDateUpdated
):
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
        public_id: str | None = None,
        description: str | None = None,
        downloads: int = 0,
        id: int | None = None,
    ) -> None:
        kwargs: dict[str, None | int | str] = {}
        kwargs["version"] = version
        kwargs["apk_filename"] = apk_filename
        if public_id is not None:
            kwargs["public_id"] = public_id
        kwargs["description"] = description
        kwargs["downloads"] = downloads
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
