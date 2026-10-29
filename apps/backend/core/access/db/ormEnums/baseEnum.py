from sqlalchemy import String
from sqlalchemy.orm import Mapped, declarative_mixin, mapped_column

from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementKey,
    TableDateAdded,
)


@declarative_mixin
class BaseEnumRow(TableAutoincrementKey, TableDateAdded):
    value: Mapped[str] = mapped_column(String, nullable=False, unique=True)

    def __init__(self, key: int, value: str) -> None:
        kwargs: dict[str, int | str] = {}
        kwargs["key"] = key
        kwargs["value"] = value
        for k, v in kwargs.items():
            setattr(self, k, v)
