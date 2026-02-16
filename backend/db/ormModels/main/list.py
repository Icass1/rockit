from typing import Final, Literal, TYPE_CHECKING, Dict

from sqlalchemy import Enum, String
from sqlalchemy.orm import relationship, mapped_column, Mapped

from backend.db.base import Base
from backend.db.ormModels.declarativeMixin import TableAutoincrementId, TableDateAdded, TableDateUpdated
from backend.db.associationTables.user_library_lists import user_library_lists
from backend.db.associationTables.user_pinned_lists import user_pinned_lists

if TYPE_CHECKING:
    from backend.db.ormModels.main.user import UserRow
    from backend.db.ormModels.main.album import AlbumRow
    from backend.db.ormModels.main.playlist import PlaylistRow


LIST_TYPES: Final[tuple[str, ...]] = (
    "album",
    "playlist"
)

LIST_TYPE_TYPE = Literal[
    "album",
    "playlist"
]


class ListRow(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'lists'
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    type: Mapped[LIST_TYPE_TYPE] = mapped_column(Enum(*LIST_TYPES, name="list_type_enum",
                                                      schema="main"), nullable=False, unique=False)
    public_id: Mapped[str] = mapped_column(String, nullable=False, unique=True)

    # Relationships
    album: Mapped["AlbumRow"] = relationship("AlbumRow", back_populates="list",
                                             uselist=False, cascade="all, delete-orphan")
    playlist: Mapped["PlaylistRow"] = relationship("PlaylistRow", back_populates="list",
                                                   uselist=False, cascade="all, delete-orphan")

    pinned_by_users: Mapped["UserRow"] = relationship(
        "UserRow", secondary=user_pinned_lists, back_populates="pinned_lists")

    users: Mapped["UserRow"] = relationship(
        "UserRow", secondary=user_library_lists, back_populates="lists")

    def __init__(self, type: LIST_TYPE_TYPE, public_id: str):
        kwargs: Dict[str, str | LIST_TYPE_TYPE] = {}
        kwargs['type'] = type
        kwargs['public_id'] = public_id
        for k, v in kwargs.items():
            setattr(self, k, v)
