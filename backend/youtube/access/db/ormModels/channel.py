from typing import List, TYPE_CHECKING, Dict

from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import relationship, mapped_column, Mapped

from backend.youtube.access.db.base import YoutubeBase
from backend.core.access.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated
from backend.youtube.access.db.associationTables.video_channels import video_channels

if TYPE_CHECKING:
    from backend.youtube.access.db.ormModels.video import VideoRow


class ChannelRow(YoutubeBase, TableDateUpdated, TableDateAdded):
    __tablename__ = 'channel'
    __table_args__ = {'schema': 'youtube', 'extend_existing': True},

    id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey('core.artist.id'),
        primary_key=True)
    youtube_id: Mapped[str] = mapped_column(
        String,
        unique=True,
        nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    subscriber_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    view_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    video_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    internal_image_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey('core.image.id'),
        nullable=True)
    description: Mapped[str | None] = mapped_column(String, nullable=True)

    videos: Mapped[List["VideoRow"]] = relationship(
        "VideoRow",
        secondary=video_channels,
        back_populates="channels")

    def __init__(self, id: int, youtube_id: str, name: str, subscriber_count: int = 0, view_count: int = 0, video_count: int = 0, internal_image_id: int | None = None, description: str | None = None):
        kwargs: Dict[str, None | int | str] = {}
        kwargs['id'] = id
        kwargs['youtube_id'] = youtube_id
        kwargs['name'] = name
        kwargs['subscriber_count'] = subscriber_count
        kwargs['view_count'] = view_count
        kwargs['video_count'] = video_count
        kwargs['internal_image_id'] = internal_image_id
        kwargs['description'] = description
        for k, v in kwargs.items():
            setattr(self, k, v)
