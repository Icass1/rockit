from sqlalchemy import ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, WriteOnlyMapped, mapped_column, relationship

from core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
)
from youtube.access.db.associationTables.playlist_external_images import (
    playlist_external_images,
)
from youtube.access.db.base import YoutubeBase
from youtube.access.db.ormModels.externalImage import ExternalImageRow
from youtube.access.db.ormModels.playlist_videos import PlaylistVideoRow


class YoutubePlaylistRow(YoutubeBase, TableDateUpdated, TableDateAdded):
    __tablename__ = "playlist"
    __table_args__ = (
        Index(
            "ix_youtube_playlist_name_trgm",
            "name",
            postgresql_using="gin",
            postgresql_ops={"name": "gin_trgm_ops"},
        ),
        {"schema": "youtube", "extend_existing": True},
    )

    id: Mapped[int] = mapped_column(Integer, ForeignKey("core.media.id"), primary_key=True)
    youtube_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    image_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.image.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    owner: Mapped[str] = mapped_column(String, nullable=False)
    video_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    view_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    external_images: WriteOnlyMapped[list[ExternalImageRow]] = relationship(
        ExternalImageRow,
        secondary=playlist_external_images,
        back_populates="playlists",
        lazy="write_only",
    )
    playlist_video_links: Mapped[list["PlaylistVideoRow"]] = relationship(
        "PlaylistVideoRow", back_populates="playlist"
    )

    def __init__(
        self,
        id: int,
        youtube_id: str,
        image_id: int,
        name: str,
        owner: str,
        video_count: int = 0,
        view_count: int = 0,
        description: str | None = None,
    ) -> None:
        kwargs: dict[str, None | int | str] = {}
        kwargs["id"] = id
        kwargs["youtube_id"] = youtube_id
        kwargs["image_id"] = image_id
        kwargs["name"] = name
        kwargs["owner"] = owner
        kwargs["video_count"] = video_count
        kwargs["view_count"] = view_count
        kwargs["description"] = description
        for k, v in kwargs.items():
            setattr(self, k, v)
