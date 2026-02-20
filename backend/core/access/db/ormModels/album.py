
from typing import TYPE_CHECKING, Dict

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import mapped_column, relationship, Mapped

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId

if TYPE_CHECKING:
    from backend.core.access.db.ormModels.provider import ProviderRow


class CoreAlbumRow(CoreBase, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'album'
    __table_args__ = {'schema': 'core', 'extend_existing': True},

    provider_id: Mapped[int] = mapped_column(
        Integer, ForeignKey('core.provider.id'),
        nullable=False)

    provider: Mapped["ProviderRow"] = relationship(
        "ProviderRow",
        back_populates="albums",
        uselist=False
    )

    def __init__(self, provider_id: int):
        kwargs: Dict[str, int] = {}
        kwargs['provider_id'] = provider_id
        for k, v in kwargs.items():
            setattr(self, k, v)
