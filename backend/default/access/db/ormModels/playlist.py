from typing import TYPE_CHECKING, Dict, List

from sqlalchemy import ForeignKey, Integer, String, Boolean
from sqlalchemy.orm import mapped_column, relationship, Mapped

from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
)
from backend.core.access.db.ormModels.media import CoreMediaRow
from backend.core.access.db.ormModels.image import ImageRow

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
    image_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.image.id"), nullable=False
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
    image: Mapped["ImageRow"] = relationship(ImageRow, lazy="selectin", uselist=False)

    def __init__(
        self,
        id: int,
        name: str,
        image_id: int,
        owner_id: int,
        description: str | None = None,
        is_public: bool = True,
    ):
        kwargs: Dict[str, None | bool | int | str] = {}
        kwargs["id"] = id
        kwargs["name"] = name
        kwargs["image_id"] = image_id
        kwargs["owner_id"] = owner_id
        kwargs["description"] = description
        kwargs["is_public"] = is_public
        for k, v in kwargs.items():
            setattr(self, k, v)
