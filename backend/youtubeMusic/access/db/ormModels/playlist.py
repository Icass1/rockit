from typing import List, Dict

from sqlalchemy import String, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship, mapped_column, Mapped

from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
    TableAutoincrementId,
)
from backend.core.access.db.ormModels.image import ImageRow
from backend.core.access.db.ormModels.media import CoreMediaRow

from backend.youtubeMusic.access.db.base import YoutubeMusicBase
from backend.youtubeMusic.access.db.ormModels.playlist_track import (
    PlaylistTrackRow,
)


class PlaylistRow(
    YoutubeMusicBase, TableAutoincrementId, TableDateUpdated, TableDateAdded
):
    __tablename__ = "playlist"
    __table_args__ = ({"schema": "youtube_music", "extend_existing": True},)

    id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.media.id"), primary_key=True
    )
    youtube_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    image_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("core.image.id"), nullable=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    owner: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    playlist_song_links: Mapped[List["PlaylistTrackRow"]] = relationship(
        "PlaylistTrackRow", back_populates="playlist"
    )

    core_playlist: Mapped["CoreMediaRow"] = relationship(
        CoreMediaRow, lazy="selectin", uselist=False
    )

    image: Mapped["ImageRow"] = relationship(ImageRow, lazy="selectin", uselist=False)

    def __init__(
        self,
        id: int,
        youtube_id: str,
        name: str,
        owner: str,
        image_id: int | None = None,
        description: str | None = None,
    ):
        kwargs: Dict[str, None | int | str] = {}
        kwargs["id"] = id
        kwargs["youtube_id"] = youtube_id
        kwargs["name"] = name
        kwargs["owner"] = owner
        kwargs["image_id"] = image_id
        kwargs["description"] = description
        for k, v in kwargs.items():
            setattr(self, k, v)
