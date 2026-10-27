from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
)
from default.access.db.base import DefaultBase

if TYPE_CHECKING:
    from default.access.db.ormModels.playlist import PlaylistRow


class PlaylistMediaRow(DefaultBase, TableAutoincrementId, TableDateAdded, TableDateUpdated):
    __tablename__ = "playlist_media"
    __table_args__ = (
        UniqueConstraint("playlist_id", "position", name="uq_playlist_media_position"),
        Index("ix_playlist_media_media_id", "media_id"),
        {"schema": "default_schema", "extend_existing": True},
    )

    playlist_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("default_schema.playlist.id"), nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    media_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.media.id"), nullable=False)

    playlist: Mapped["PlaylistRow"] = relationship("PlaylistRow", back_populates="playlist_medias")

    def __init__(
        self, playlist_id: int, position: int, media_id: int, id: int | None = None
    ) -> None:
        kwargs: dict[str, None | int] = {}
        kwargs["playlist_id"] = playlist_id
        kwargs["position"] = position
        kwargs["media_id"] = media_id
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
