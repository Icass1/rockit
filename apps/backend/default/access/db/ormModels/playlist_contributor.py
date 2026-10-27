from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.access.db.ormEnums.playlistContributorRoleEnum import (
    PlaylistContributorRoleEnumRow,
)
from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
)
from default.access.db.base import DefaultBase

if TYPE_CHECKING:
    from default.access.db.ormModels.playlist import (
        PlaylistRow,
    )


class PlaylistContributorRow(DefaultBase, TableAutoincrementId, TableDateAdded, TableDateUpdated):
    __tablename__ = "playlist_contributor"
    __table_args__ = ({"schema": "default_schema", "extend_existing": True},)

    playlist_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("default_schema.playlist.id"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.user.id"), nullable=False)
    role_key: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("core.playlist_contributor_role_enum.key"),
        nullable=False,
    )

    playlist: Mapped["PlaylistRow"] = relationship("PlaylistRow", back_populates="contributors")

    role_enum: Mapped[PlaylistContributorRoleEnumRow] = relationship(
        PlaylistContributorRoleEnumRow, uselist=False
    )

    def __init__(
        self, playlist_id: int, user_id: int, role_key: int, id: int | None = None
    ) -> None:
        kwargs: dict[str, None | int] = {}
        kwargs["playlist_id"] = playlist_id
        kwargs["user_id"] = user_id
        kwargs["role_key"] = role_key
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
