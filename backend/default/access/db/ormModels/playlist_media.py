from typing import TYPE_CHECKING, Dict

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import mapped_column, relationship, Mapped

from backend.default.access.db.base import DefaultBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableAutoincrementId,
    TableDateUpdated,
)

if TYPE_CHECKING:
    from backend.default.access.db.ormModels.playlist import PlaylistRow


class PlaylistMediaRow(
    DefaultBase, TableAutoincrementId, TableDateAdded, TableDateUpdated
):
    __tablename__ = "playlist_media"
    __table_args__ = ({"extend_existing": True},)

    playlist_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("default_schema.playlist.id"), nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    media_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.media.id"), nullable=False
    )

    playlist: Mapped["PlaylistRow"] = relationship(
        "PlaylistRow", back_populates="playlist_medias"
    )

    def __init__(self, playlist_id: int, position: int, media_id: int):
        kwargs: Dict[str, int] = {}
        kwargs["playlist_id"] = playlist_id
        kwargs["position"] = position
        kwargs["media_id"] = media_id
        for k, v in kwargs.items():
            setattr(self, k, v)
