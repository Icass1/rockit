from typing import TYPE_CHECKING
from datetime import datetime

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, TIMESTAMP, Boolean, String
from backend.db.base import Base
from backend.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated

if TYPE_CHECKING:
    from backend.db.ormModels.main.playlist import PlaylistRow
    from backend.db.ormModels.main.song import SongRow


class PlaylistSongLink(Base, TableDateUpdated, TableDateAdded):
    __tablename__ = 'playlist_songs'
    __table_args__ = {'schema': 'main'}

    playlist_id: Mapped[int] = mapped_column(
        ForeignKey('main.playlists.id'), primary_key=True)
    song_id: Mapped[int] = mapped_column(
        ForeignKey('main.songs.id'), primary_key=True)
    added_by: Mapped[str | None] = mapped_column(String, nullable=True)
    added_at: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False)
    disabled: Mapped[bool] = mapped_column(Boolean, nullable=False)

    playlist: Mapped["PlaylistRow"] = relationship(
        "PlaylistRow", back_populates="playlist_song_links")
    song: Mapped["SongRow"] = relationship(
        "SongRow", back_populates="playlist_song_links")

    def __init__(self, playlist_id: int, song_id: int, added_at: datetime, disabled: bool, added_by: str | None = None):
        kwargs = {}
        kwargs['playlist_id'] = playlist_id
        kwargs['song_id'] = song_id
        kwargs['added_at'] = added_at
        kwargs['disabled'] = disabled
        kwargs['added_by'] = added_by
        for k, v in kwargs.items():
            setattr(self, k, v)
