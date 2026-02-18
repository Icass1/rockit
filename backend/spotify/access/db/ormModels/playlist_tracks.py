from typing import TYPE_CHECKING
from datetime import datetime

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, TIMESTAMP, Boolean, String
from backend.core.access.db.base import Base
from backend.core.access.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated

if TYPE_CHECKING:
    from backend.spotify.access.db.ormModels.playlist import PlaylistRow
    from backend.spotify.access.db.ormModels.track import TrackRow


class PlaylistTrackRow(Base, TableDateUpdated, TableDateAdded):
    __tablename__ = 'playlist_track'
    __table_args__ = {'schema': 'spotify'}

    playlist_id: Mapped[int] = mapped_column(
        ForeignKey('spotify.playlist.id'), primary_key=True)
    song_id: Mapped[int] = mapped_column(
        ForeignKey('spotify.track.id'), primary_key=True)
    added_by: Mapped[str | None] = mapped_column(String, nullable=True)
    added_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False)
    disabled: Mapped[bool] = mapped_column(Boolean, nullable=False)

    playlist: Mapped["PlaylistRow"] = relationship(
        "PlaylistRow", back_populates="playlist_song_links")
    track: Mapped["TrackRow"] = relationship(
        "TrackRow", back_populates="playlist_song_links")

    def __init__(self, playlist_id: int, song_id: int, added_at: datetime, disabled: bool, added_by: str | None = None):
        kwargs: Dict[str, None | bool | datetime | int | str] = {}
        kwargs['playlist_id'] = playlist_id
        kwargs['song_id'] = song_id
        kwargs['added_at'] = added_at
        kwargs['disabled'] = disabled
        kwargs['added_by'] = added_by
        for k, v in kwargs.items():
            setattr(self, k, v)
