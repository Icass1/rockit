from typing import Dict

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import mapped_column, Mapped

from backend.default.access.db.base import DefaultBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableAutoincrementId,
    TableDateUpdated,
)


class PlaylistContributorRow(
    DefaultBase, TableAutoincrementId, TableDateAdded, TableDateUpdated
):
    __tablename__ = "playlist_contributor"
    __table_args__ = ({"extend_existing": True},)

    playlist_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("default_schema.playlist.id"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id"), nullable=False
    )
    role_key: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("default_schema.playlist_contributor_role_enum.key"),
        nullable=False,
    )

    def __init__(self, playlist_id: int, user_id: int, role_key: int):
        kwargs: Dict[str, int] = {}
        kwargs["playlist_id"] = playlist_id
        kwargs["user_id"] = user_id
        kwargs["role_key"] = role_key
        for k, v in kwargs.items():
            setattr(self, k, v)
