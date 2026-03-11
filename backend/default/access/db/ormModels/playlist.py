from typing import TYPE_CHECKING, Dict, List

from sqlalchemy import ForeignKey, Integer, String, Boolean
from sqlalchemy.orm import mapped_column, relationship, Mapped

from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
    TablePublicId,
)
from backend.default.access.db.base import DefaultBase
from backend.core.access.db.ormModels.media import CoreMediaRow

if TYPE_CHECKING:
    from backend.core.access.db.ormModels.media import CoreMediaRow
    from backend.core.access.db.ormModels.user import UserRow
    from backend.default.access.db.ormModels.playlist_contributor import (
        PlaylistContributorRow,
    )


class PlaylistRow(DefaultBase, TablePublicId, TableDateUpdated, TableDateAdded):
    __tablename__ = "playlist"
    __table_args__ = ({"extend_existing": True},)

    id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.media.id"), primary_key=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    cover_image: Mapped[str] = mapped_column(
        String, nullable=False, default="playlist-placeholder.png"
    )
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    owner_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id"), nullable=False
    )

    owner: Mapped["UserRow"] = relationship("UserRow", back_populates=None)
    playlist_medias: Mapped[List["CoreMediaRow"]] = relationship(
        "CoreMediaRow", back_populates="playlist", uselist=True
    )
    contributors: Mapped[List["PlaylistContributorRow"]] = relationship(
        "PlaylistContributorRow", back_populates="playlist", uselist=True
    )

    def __init__(
        self,
        public_id: str,
        id: int,
        name: str,
        owner_id: int,
        description: str | None = None,
        cover_image: str = "playlist-placeholder.png",
        is_public: bool = True,
    ):
        kwargs: Dict[str, None | bool | int | str] = {}
        kwargs["public_id"] = public_id
        kwargs["id"] = id
        kwargs["name"] = name
        kwargs["owner_id"] = owner_id
        kwargs["description"] = description
        kwargs["cover_image"] = cover_image
        kwargs["is_public"] = is_public
        for k, v in kwargs.items():
            setattr(self, k, v)
