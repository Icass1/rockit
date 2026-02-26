from typing import TYPE_CHECKING, Dict
from datetime import datetime

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, TIMESTAMP, Boolean, String

from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
)
from backend.youtube.access.db.base import YoutubeBase

if TYPE_CHECKING:
    from backend.youtube.access.db.ormModels.playlist import YoutubePlaylistRow
    from backend.youtube.access.db.ormModels.video import VideoRow


class PlaylistVideoRow(YoutubeBase, TableDateUpdated, TableDateAdded):
    __tablename__ = "playlist_video"
    __table_args__ = {"schema": "youtube"}

    playlist_id: Mapped[int] = mapped_column(
        ForeignKey("youtube.playlist.id"), primary_key=True
    )
    video_id: Mapped[int] = mapped_column(
        ForeignKey("youtube.video.id"), primary_key=True
    )
    added_by: Mapped[str | None] = mapped_column(String, nullable=True)
    added_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    disabled: Mapped[bool] = mapped_column(Boolean, nullable=False)

    playlist: Mapped["YoutubePlaylistRow"] = relationship(
        "YoutubePlaylistRow", back_populates="playlist_video_links"
    )
    video: Mapped["VideoRow"] = relationship(
        "VideoRow", back_populates="playlist_video_links"
    )

    def __init__(
        self,
        playlist_id: int,
        video_id: int,
        added_at: datetime,
        disabled: bool,
        added_by: str | None = None,
    ):
        kwargs: Dict[str, None | bool | datetime | int | str] = {}
        kwargs["playlist_id"] = playlist_id
        kwargs["video_id"] = video_id
        kwargs["added_at"] = added_at
        kwargs["disabled"] = disabled
        kwargs["added_by"] = added_by
        for k, v in kwargs.items():
            setattr(self, k, v)
