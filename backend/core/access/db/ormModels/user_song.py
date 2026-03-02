from typing import Dict

from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import mapped_column, Mapped

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableAutoincrementId,
)


class UserSongRow(CoreBase, TableAutoincrementId, TableDateAdded):
    __tablename__ = "user_song"
    __table_args__ = (
        UniqueConstraint("user_id", "song_id", name="uq_user_song"),
        {"schema": "core", "extend_existing": True},
    )

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id"), nullable=False
    )

    song_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.song.id"), nullable=False
    )

    def __init__(self, user_id: int, song_id: int):
        kwargs: Dict[str, int] = {}
        kwargs["user_id"] = user_id
        kwargs["song_id"] = song_id
        for k, v in kwargs.items():
            setattr(self, k, v)
