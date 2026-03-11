from typing import Dict

from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import mapped_column, Mapped

from backend.core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
)
from backend.default.access.db.base import DefaultBase


class UserDisabledPlaylistMediaRow(DefaultBase, TableAutoincrementId, TableDateAdded):
    __tablename__ = "user_disabled_playlist_media"
    __table_args__ = (
        UniqueConstraint("user_id", "playlist_media_id", name="uq_user_playlist_media"),
        {"extend_existing": True},
    )

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id"), nullable=False
    )
    playlist_media_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("default_schema.playlist_media.id"), nullable=False
    )

    def __init__(self, user_id: int, playlist_media_id: int):
        kwargs: Dict[str, int] = {}
        kwargs["user_id"] = user_id
        kwargs["playlist_media_id"] = playlist_media_id
        for k, v in kwargs.items():
            setattr(self, k, v)
