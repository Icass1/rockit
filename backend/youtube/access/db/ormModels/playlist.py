from typing import List, Dict

from sqlalchemy import String, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship, mapped_column, Mapped, WriteOnlyMapped

from backend.core.access.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated

from backend.youtube.access.db.base import YoutubeBase
from backend.youtube.access.db.associationTables.playlist_external_images import playlist_external_images
from backend.youtube.access.db.ormModels.playlist_videos import PlaylistVideoRow
from backend.youtube.access.db.ormModels.externalImage import ExternalImageRow


class YoutubePlaylistRow(YoutubeBase, TableDateUpdated, TableDateAdded):
    __tablename__ = 'playlist'
    __table_args__ = {'schema': 'youtube', 'extend_existing': True},

    id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey('core.playlist.id'),
        primary_key=True)
    youtube_id: Mapped[str] = mapped_column(
        String,
        unique=True,
        nullable=False)
    internal_image_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey('core.image.id'),
        nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    owner: Mapped[str] = mapped_column(String, nullable=False)
    video_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    view_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    external_images: WriteOnlyMapped[List[ExternalImageRow]] = relationship(
        ExternalImageRow,
        secondary=playlist_external_images,
        back_populates="playlists",
        lazy="write_only"
    )
    playlist_video_links: Mapped[List["PlaylistVideoRow"]] = relationship(
        "PlaylistVideoRow",
        back_populates="playlist"
    )

    def __init__(self, id: int, youtube_id: str, name: str, owner: str, internal_image_id: int | None = None, video_count: int = 0, view_count: int = 0, description: str | None = None):
        kwargs: Dict[str, None | int | str] = {}
        kwargs['id'] = id
        kwargs['youtube_id'] = youtube_id
        kwargs['name'] = name
        kwargs['owner'] = owner
        kwargs['internal_image_id'] = internal_image_id
        kwargs['video_count'] = video_count
        kwargs['view_count'] = view_count
        kwargs['description'] = description
        for k, v in kwargs.items():
            setattr(self, k, v)
