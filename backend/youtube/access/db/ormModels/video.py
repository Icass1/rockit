from typing import List, TYPE_CHECKING, Dict

from sqlalchemy import String, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship, mapped_column, Mapped, WriteOnlyMapped

from backend.core.access.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId

from backend.youtube.access.db.base import YoutubeBase
from backend.youtube.access.db.associationTables.video_channels import video_channels

if TYPE_CHECKING:
    from backend.youtube.access.db.ormModels.channel import ChannelRow
    from backend.youtube.access.db.ormModels.playlist_videos import PlaylistVideoRow


class VideoRow(YoutubeBase, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = "video"
    __table_args__ = {'schema': 'youtube', 'extend_existing': True},

    id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey('core.video.id'),
        primary_key=True)
    youtube_id: Mapped[str] = mapped_column(
        String,
        unique=True,
        nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    duration: Mapped[int] = mapped_column(Integer, nullable=False)
    view_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    like_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    comment_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0)
    internal_image_id: Mapped[int] = mapped_column(Integer, ForeignKey(
        'core.image.id'), nullable=False)
    path: Mapped[str | None] = mapped_column(String, nullable=True)
    channel_id: Mapped[int] = mapped_column(Integer, ForeignKey(
        'youtube.channel.id'), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    youtube_url: Mapped[str | None] = mapped_column(String, nullable=True)
    tags: Mapped[str | None] = mapped_column(String, nullable=True)
    published_at: Mapped[str | None] = mapped_column(String, nullable=True)

    channels: WriteOnlyMapped[List["ChannelRow"]] = relationship(
        "ChannelRow", secondary=video_channels, back_populates="videos",
        lazy="write_only")

    playlist_video_links: Mapped[List["PlaylistVideoRow"]] = relationship(
        "PlaylistVideoRow",
        back_populates="video"
    )

    def __init__(self, id: int, youtube_id: str, name: str, duration: int, internal_image_id: int, channel_id: int, view_count: int = 0, like_count: int = 0, comment_count: int = 0, path: str | None = None, description: str | None = None, youtube_url: str | None = None, tags: str | None = None, published_at: str | None = None):
        kwargs: Dict[str, None | int | str] = {}
        kwargs['id'] = id
        kwargs['youtube_id'] = youtube_id
        kwargs['name'] = name
        kwargs['duration'] = duration
        kwargs['internal_image_id'] = internal_image_id
        kwargs['channel_id'] = channel_id
        kwargs['view_count'] = view_count
        kwargs['like_count'] = like_count
        kwargs['comment_count'] = comment_count
        kwargs['path'] = path
        kwargs['description'] = description
        kwargs['youtube_url'] = youtube_url
        kwargs['tags'] = tags
        kwargs['published_at'] = published_at
        for k, v in kwargs.items():
            setattr(self, k, v)
