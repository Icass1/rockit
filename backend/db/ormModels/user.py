from sqlalchemy import String, Integer, Enum, Boolean, Double
from sqlalchemy.orm import mapped_column, relationship

from backend.db.base import Base

from backend.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId

from backend.db.associationTables.user_history_songs import user_history_songs
from backend.db.associationTables.user_pinned_lists import user_pinned_lists
from backend.db.associationTables.user_liked_songs import user_liked_songs
from backend.db.associationTables.user_queue_songs import user_queue_songs
from backend.db.associationTables.user_lists import user_lists


class UserRow(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'users'
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    public_id = mapped_column(String, nullable=False, unique=True)
    username = mapped_column(String, nullable=False, unique=True)
    password_hash = mapped_column(String, nullable=False)
    current_station = mapped_column(String, nullable=True)
    current_time = mapped_column(Integer, nullable=True)
    queue_index = mapped_column(Integer, nullable=True)
    random_queue = mapped_column(Boolean, nullable=False, default=False)
    repeat_song = mapped_column(Enum(
        "off", "one", "all", name="repeat_song_enum", schema="main"), nullable=False, default="off")
    volume = mapped_column(Double, nullable=False, default=1)
    cross_fade = mapped_column(Double, nullable=False, default=0)
    lang = mapped_column(String, nullable=False, default="en")
    admin = mapped_column(Boolean, nullable=False, default=False)
    super_admin = mapped_column(Boolean, nullable=False, default=False)

    # many-to-many with songs
    history_songs = relationship(
        "SongRow", secondary=user_history_songs, back_populates="history_users")
    liked_songs = relationship(
        "SongRow", secondary=user_liked_songs, back_populates="liked_by_users")
    queue_songs = relationship(
        "SongRow", secondary=user_queue_songs, back_populates="queued_by_users")
    pinned_lists = relationship(
        "ListRow", secondary=user_pinned_lists, back_populates="pinned_by_users")

    # many-to-many with lists
    # change pinned_lists if needed
    lists = relationship("ListRow", secondary=user_lists,
                         back_populates="users")

    # one-to-many
    downloads = relationship("DownloadRow", back_populates="user")
    errors = relationship("ErrorRow", back_populates="user")
