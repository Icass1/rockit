from typing import List, TYPE_CHECKING

from sqlalchemy import DOUBLE_PRECISION, ForeignKey, String, Integer
from sqlalchemy.orm import relationship, mapped_column, Mapped

from backend.db.base import Base
from backend.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId

if TYPE_CHECKING:
    from backend.db.ormModels.song import SongRow
    from backend.db.ormModels.download import DownloadRow


class DownloadStatusRow(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'downloads_status'
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    download_id: Mapped[int] = mapped_column(
        Integer, ForeignKey(
            'main.downloads.id'), nullable=False, unique=False)
    song_id: Mapped[int] = mapped_column(Integer, ForeignKey(
        'main.songs.id'), nullable=False)
    message: Mapped[str] = mapped_column(String, nullable=False)
    completed: Mapped[float] = mapped_column(DOUBLE_PRECISION, nullable=False)

    song: Mapped["SongRow"] = relationship(
        "SongRow", back_populates="downloads")

    download: Mapped["DownloadRow"] = relationship(
        "DownloadRow", back_populates="downloads")

    def __init__(self, download_id: int, song_id: int, message: str, completed: float):
        kwargs = {}
        kwargs['download_id'] = download_id
        kwargs['song_id'] = song_id
        kwargs['message'] = message
        kwargs['completed'] = completed
        for k, v in kwargs.items():
            setattr(self, k, v)
