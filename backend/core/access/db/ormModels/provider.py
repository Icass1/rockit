from typing import Dict

from sqlalchemy import String
from sqlalchemy.orm import mapped_column, Mapped

from backend.core.access.db.base import Base
from backend.core.access.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId


class ProviderRow(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'provider'
    __table_args__ = {'schema': 'core', 'extend_existing': True},

    name: Mapped[str] = mapped_column(
        String,
        nullable=False,
        unique=True)

    module: Mapped[str] = mapped_column(
        String,
        nullable=False,
        unique=True)

    def __init__(self, name: str, module: str):
        kwargs: Dict[str, str] = {}
        kwargs['name'] = name
        kwargs['module'] = module
        for k, v in kwargs.items():
            setattr(self, k, v)
