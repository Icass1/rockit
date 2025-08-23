from sqlalchemy import Enum, String
from sqlalchemy.orm import relationship, mapped_column, Mapped

from backend.db.base import Base

from backend.db.ormModels.album import AlbumRow
from backend.db.ormModels.declarativeMixin import TableAutoincrementId, TableDateAdded, TableDateUpdated
from backend.db.ormModels.playlist import PlaylistRow
from backend.db.ormModels.user import UserRow


class ListRow(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'lists'
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    type: Mapped[str] = mapped_column(Enum("album", "playlist", name="type_enum",
                                           schema="main"), nullable=False, unique=False)
    public_id: Mapped[str] = mapped_column(String, nullable=False, unique=True)

    # Relationships
    album: Mapped[AlbumRow] = relationship("AlbumRow", back_populates="list",
                                           uselist=False, cascade="all, delete-orphan")
    playlist: Mapped[PlaylistRow] = relationship("PlaylistRow", back_populates="list",
                                                 uselist=False, cascade="all, delete-orphan")

    users: Mapped[UserRow] = relationship(
        "UserRow", secondary="main.user_lists", back_populates="lists")
