from typing import Dict
from datetime import datetime

from sqlalchemy import String
from sqlalchemy.orm import mapped_column, Mapped

from backend.core.access.db.base import Base
from backend.core.access.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId


class ProviderRow(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'provider'
    __table_args__ = {'schema': 'core', 'extend_existing': True},

    provider_name: Mapped[str] = mapped_column(
        String,
        nullable=False,
        unique=True)

    def __init__(self, provider_name: str):
        kwargs: Dict[str, str] = {}
        kwargs['provider_name'] = provider_name
        for k, v in kwargs.items():
            setattr(self, k, v)
