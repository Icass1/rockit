from typing import List, TYPE_CHECKING, Dict

from sqlalchemy import String, Integer
from sqlalchemy.orm import relationship, mapped_column, Mapped

from backend.youtube.access.db.base import YoutubeBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
    TableAutoincrementId,
    TablePublicId,
)
from backend.youtube.access.db.associationTables.playlist_external_images import (
    playlist_external_images,
)

if TYPE_CHECKING:
    from backend.youtube.access.db.ormModels.playlist import YoutubePlaylistRow


class ExternalImageRow(
    YoutubeBase, TableAutoincrementId, TablePublicId, TableDateUpdated, TableDateAdded
):
    __tablename__ = "external_image"
    __table_args__ = ({"schema": "youtube", "extend_existing": True},)

    url: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)

    playlists: Mapped[List["YoutubePlaylistRow"]] = relationship(
        "YoutubePlaylistRow",
        secondary=playlist_external_images,
        back_populates="external_images",
    )

    def __init__(
        self,
        public_id: str,
        url: str,
        width: int | None = None,
        height: int | None = None,
    ):
        kwargs: Dict[str, None | int | str] = {}
        kwargs["public_id"] = public_id
        kwargs["url"] = url
        kwargs["width"] = width
        kwargs["height"] = height
        for k, v in kwargs.items():
            setattr(self, k, v)
