
from typing import TYPE_CHECKING, Dict, List

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import mapped_column, relationship, Mapped

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId, TablePublicId

if TYPE_CHECKING:
    from backend.core.access.db.ormModels.provider import ProviderRow
    from backend.core.access.db.ormModels.user_album import UserAlbumRow


class CoreAlbumRow(CoreBase, TableAutoincrementId, TablePublicId, TableDateUpdated, TableDateAdded):
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

    user_albums: Mapped[List["UserAlbumRow"]] = relationship(
        "UserAlbumRow", back_populates="album")

    def __init__(self, public_id: str, provider_id: int):
        kwargs: Dict[str, int | str] = {}
        kwargs['public_id'] = public_id
        kwargs['provider_id'] = provider_id
        for k, v in kwargs.items():
            setattr(self, k, v)
