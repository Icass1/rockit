from typing import TYPE_CHECKING, Dict, List

from sqlalchemy import String
from sqlalchemy.orm import mapped_column, Mapped, relationship

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId

if TYPE_CHECKING:
    from backend.core.access.db.ormModels.song import CoreSongRow


class ProviderRow(CoreBase, TableAutoincrementId, TableDateUpdated, TableDateAdded):
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

    songs: Mapped[List["CoreSongRow"]] = relationship(
        "ProviderRow",
        back_populates="provider",
        uselist=True
    )

    def __init__(self, name: str, module: str):
        kwargs: Dict[str, str] = {}
        kwargs['name'] = name
        kwargs['module'] = module
        for k, v in kwargs.items():
            setattr(self, k, v)
