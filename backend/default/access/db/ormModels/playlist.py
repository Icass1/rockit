from typing import TYPE_CHECKING, Dict, List

from sqlalchemy import ForeignKey, Integer, String, Boolean
from sqlalchemy.orm import mapped_column, relationship, Mapped

from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
)
from backend.core.access.db.ormModels.media import CoreMediaRow

from backend.default.access.db.base import DefaultBase

if TYPE_CHECKING:
    from backend.default.access.db.ormModels.playlist_contributor import (
        PlaylistContributorRow,
    )
    from backend.default.access.db.ormModels.playlist_media import (
        PlaylistMediaRow,
    )


class PlaylistRow(DefaultBase, TableDateUpdated, TableDateAdded):
    __tablename__ = "playlist"
    __table_args__ = ({"extend_existing": True},)

    id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.media.id"), primary_key=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    cover_image: Mapped[str] = mapped_column(
        String, nullable=False, default="/image/playlist-placeholder.png"
    )
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    owner_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id"), nullable=False
    )

    playlist_medias: Mapped[List["PlaylistMediaRow"]] = relationship(
        "PlaylistMediaRow", back_populates="playlist", uselist=True
    )
    contributors: Mapped[List["PlaylistContributorRow"]] = relationship(
        "PlaylistContributorRow", back_populates="playlist", uselist=True
    )

    core_playlist: Mapped["CoreMediaRow"] = relationship(
        CoreMediaRow, lazy="selectin", uselist=False
    )

    def __init__(
        self,
        id: int,
        name: str,
        owner_id: int,
        description: str | None = None,
        cover_image: str = "/image/playlist-placeholder.png",
        is_public: bool = True,
    ):
        kwargs: Dict[str, None | bool | int | str] = {}
        kwargs["id"] = id
        kwargs["name"] = name
        kwargs["owner_id"] = owner_id
        kwargs["description"] = description
        kwargs["cover_image"] = cover_image
        kwargs["is_public"] = is_public
        for k, v in kwargs.items():
            setattr(self, k, v)
