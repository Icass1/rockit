from sqlalchemy import Boolean, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
)
from default.access.db.base import DefaultBase


class UserPlaylistMediaExpandedRow(
    DefaultBase, TableAutoincrementId, TableDateAdded, TableDateUpdated
):
    __tablename__ = "user_playlist_media_expanded"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "playlist_media_id",
            name="uq_user_playlist_media_expanded",
        ),
        {"schema": "default_schema", "extend_existing": True},
    )

    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.user.id"), nullable=False)
    playlist_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("default_schema.playlist.id"), nullable=False
    )
    playlist_media_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("default_schema.playlist_media.id"), nullable=False
    )
    is_expanded: Mapped[bool] = mapped_column(Boolean, nullable=False)

    def __init__(
        self,
        user_id: int,
        playlist_id: int,
        playlist_media_id: int,
        is_expanded: bool,
        id: int | None = None,
    ) -> None:
        kwargs: dict[str, None | bool | int] = {}
        kwargs["user_id"] = user_id
        kwargs["playlist_id"] = playlist_id
        kwargs["playlist_media_id"] = playlist_media_id
        kwargs["is_expanded"] = is_expanded
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
