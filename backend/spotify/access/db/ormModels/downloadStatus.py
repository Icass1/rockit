from typing import TYPE_CHECKING, Dict

from sqlalchemy import DOUBLE_PRECISION, ForeignKey, String, Integer
from sqlalchemy.orm import relationship, mapped_column, Mapped

from backend.spotify.access.db.base import SpotifyBase
from backend.core.access.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId

if TYPE_CHECKING:
    from backend.spotify.access.db.ormModels.track import TrackRow
    from backend.spotify.access.db.ormModels.download import DownloadRow


class DownloadStatusRow(SpotifyBase, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'download_status'
    __table_args__ = {'schema': 'spotify', 'extend_existing': True},

    download_id: Mapped[int] = mapped_column(
        Integer, ForeignKey(
            'spotify.download.id'), nullable=False, unique=False)
    song_id: Mapped[int] = mapped_column(Integer, ForeignKey(
        'spotify.track.id'), nullable=False)
    message: Mapped[str] = mapped_column(String, nullable=False)
    completed: Mapped[float] = mapped_column(DOUBLE_PRECISION, nullable=False)

    song: Mapped["TrackRow"] = relationship(
        "TrackRow", back_populates="downloads")

    download: Mapped["DownloadRow"] = relationship(
        "DownloadRow", back_populates="download_status_history")

    def __init__(self, download_id: int, song_id: int, message: str, completed: float):
        kwargs: Dict[str, float | int | str] = {}
        kwargs['download_id'] = download_id
        kwargs['song_id'] = song_id
        kwargs['message'] = message
        kwargs['completed'] = completed
        for k, v in kwargs.items():
            setattr(self, k, v)
