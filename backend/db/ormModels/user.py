from typing import List, TYPE_CHECKING

from sqlalchemy import String, Integer, Enum, Boolean, Double
from sqlalchemy.orm import mapped_column, relationship, Mapped

from backend.db.base import Base
from backend.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId
from backend.db.associationTables.user_lists import user_lists
from backend.db.associationTables.user_liked_songs import user_liked_songs
from backend.db.associationTables.user_queue_songs import user_queue_songs
from backend.db.associationTables.user_pinned_lists import user_pinned_lists
from backend.db.associationTables.user_history_songs import user_history_songs

if TYPE_CHECKING:
    from backend.db.ormModels.song import SongRow
    from backend.db.ormModels.list import ListRow
    from backend.db.ormModels.error import ErrorRow
    from backend.db.ormModels.download import DownloadRow


class UserRow(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'users'
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    public_id: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    username: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    current_station: Mapped[str | None] = mapped_column(String, nullable=True)
    current_time: Mapped[int | None] = mapped_column(Integer, nullable=True)
    queue_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    random_queue: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False)
    repeat_song: Mapped[str] = mapped_column(Enum(
        "off", "one", "all", name="repeat_song_enum", schema="main"), nullable=False, default="off")
    volume: Mapped[float] = mapped_column(Double, nullable=False, default=1)
    cross_fade: Mapped[float] = mapped_column(
        Double, nullable=False, default=0)
    lang: Mapped[str] = mapped_column(String, nullable=False, default="en")
    admin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    super_admin: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False)

    # many-to-many with songs
    history_songs: Mapped[List["SongRow"]] = relationship(
        "SongRow", secondary=user_history_songs, back_populates="history_users")
    liked_songs: Mapped[List["SongRow"]] = relationship(
        "SongRow", secondary=user_liked_songs, back_populates="liked_by_users")
    queue_songs: Mapped[List["SongRow"]] = relationship(
        "SongRow", secondary=user_queue_songs, back_populates="queued_by_users")
    pinned_lists: Mapped[List["ListRow"]] = relationship(
        "ListRow", secondary=user_pinned_lists, back_populates="pinned_by_users")

    # many-to-many with lists
    lists: Mapped[List["ListRow"]] = relationship("ListRow", secondary=user_lists,
                                                  back_populates="users")

    # one-to-many
    downloads: Mapped[List["DownloadRow"]] = relationship(
        "DownloadRow", back_populates="user")
    errors: Mapped[List["ErrorRow"]] = relationship(
        "ErrorRow", back_populates="user")
