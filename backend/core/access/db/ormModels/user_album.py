
from typing import TYPE_CHECKING, Dict

from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import mapped_column, Mapped, relationship

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import TableDateAdded, TableAutoincrementId

if TYPE_CHECKING:
    from backend.core.access.db.ormModels.user import UserRow
    from backend.core.access.db.ormModels.album import CoreAlbumRow


class UserAlbumRow(CoreBase, TableAutoincrementId, TableDateAdded):
    __tablename__ = 'user_album'
    __table_args__ = (
        UniqueConstraint('user_id', 'album_id', name='uq_user_album'),
        {'schema': 'core', 'extend_existing': True},
    )

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey('core.user.id'),
        nullable=False)

    album_id: Mapped[int] = mapped_column(
        Integer, ForeignKey('core.album.id'),
        nullable=False)

    user: Mapped["UserRow"] = relationship(
        "UserRow",
        back_populates="user_albums",
    )

    album: Mapped["CoreAlbumRow"] = relationship(
        "CoreAlbumRow",
        back_populates="user_albums",
    )
    def __init__(self, user_id: int, album_id: int):
        kwargs: Dict[str, int] = {}
        kwargs['user_id'] = user_id
        kwargs['album_id'] = album_id
        for k, v in kwargs.items():
            setattr(self, k, v)
