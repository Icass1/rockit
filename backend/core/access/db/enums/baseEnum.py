from typing import Dict

from sqlalchemy import String
from sqlalchemy.orm import mapped_column, Mapped, declarative_mixin

from backend.core.access.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementKey


@declarative_mixin
class BaseEnumRow(TableAutoincrementKey, TableDateUpdated, TableDateAdded):

    value: Mapped[str] = mapped_column(String, nullable=False, unique=True)

    def __init__(self, value: str):
        kwargs: Dict[str, str] = {}
        kwargs['value'] = value
        for k, v in kwargs.items():
            setattr(self, k, v)
