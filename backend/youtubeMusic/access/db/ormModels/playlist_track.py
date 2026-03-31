from typing import TYPE_CHECKING, Dict
from datetime import datetime

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, TIMESTAMP, Boolean
from sqlalchemy import Integer

from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
)
from backend.youtubeMusic.access.db.base import YoutubeMusicBase

if TYPE_CHECKING:
    from backend.youtubeMusic.access.db.ormModels.playlist import PlaylistRow
    from backend.youtubeMusic.access.db.ormModels.track import TrackRow


class PlaylistTrackRow(YoutubeMusicBase, TableDateUpdated, TableDateAdded):
    __tablename__ = "playlist_track"
    __table_args__ = {"schema": "youtube_music"}

    playlist_id: Mapped[int] = mapped_column(
        ForeignKey("youtube_music.playlist.id"), primary_key=True
    )
    song_id: Mapped[int] = mapped_column(
        ForeignKey("youtube_music.track.id"), primary_key=True
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    added_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    disabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    playlist: Mapped["PlaylistRow"] = relationship(
        "PlaylistRow", back_populates="playlist_song_links"
    )
    track: Mapped["TrackRow"] = relationship(
        "TrackRow", back_populates="playlist_song_links"
    )

    def __init__(
        self,
        playlist_id: int,
        song_id: int,
        position: int,
        added_at: datetime,
        disabled: bool = False,
    ):
        kwargs: Dict[str, bool | datetime | int] = {}
        kwargs["playlist_id"] = playlist_id
        kwargs["song_id"] = song_id
        kwargs["position"] = position
        kwargs["added_at"] = added_at
        kwargs["disabled"] = disabled
        for k, v in kwargs.items():
            setattr(self, k, v)
