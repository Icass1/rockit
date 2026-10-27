from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
)
from youtube.access.db.associationTables.video_channels import video_channels
from youtube.access.db.base import YoutubeBase

if TYPE_CHECKING:
    from youtube.access.db.ormModels.video import VideoRow


class ChannelRow(YoutubeBase, TableDateUpdated, TableDateAdded):
    __tablename__ = "channel"
    __table_args__ = (
        Index(
            "ix_youtube_channel_name_trgm",
            "name",
            postgresql_using="gin",
            postgresql_ops={"name": "gin_trgm_ops"},
        ),
        {"schema": "youtube", "extend_existing": True},
    )

    id: Mapped[int] = mapped_column(Integer, ForeignKey("core.media.id"), primary_key=True)
    youtube_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    subscriber_count: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    view_count: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    video_count: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    image_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.image.id"), nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)

    videos: Mapped[list["VideoRow"]] = relationship(
        "VideoRow", secondary=video_channels, back_populates="channels"
    )

    def __init__(
        self,
        id: int,
        youtube_id: str,
        name: str,
        image_id: int,
        subscriber_count: int = 0,
        view_count: int = 0,
        video_count: int = 0,
        description: str | None = None,
    ) -> None:
        kwargs: dict[str, None | int | str] = {}
        kwargs["id"] = id
        kwargs["youtube_id"] = youtube_id
        kwargs["name"] = name
        kwargs["image_id"] = image_id
        kwargs["subscriber_count"] = subscriber_count
        kwargs["view_count"] = view_count
        kwargs["video_count"] = video_count
        kwargs["description"] = description
        for k, v in kwargs.items():
            setattr(self, k, v)
