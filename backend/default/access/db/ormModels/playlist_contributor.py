from typing import Dict, TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import mapped_column, Mapped, relationship

from backend.default.access.db.base import DefaultBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableAutoincrementId,
    TableDateUpdated,
)

from backend.core.access.db.ormEnums.playlistContributorRoleEnum import (
    PlaylistContributorRoleEnumRow,
)

if TYPE_CHECKING:
    from backend.default.access.db.ormModels.playlist import (
        PlaylistRow,
    )


class PlaylistContributorRow(
    DefaultBase, TableAutoincrementId, TableDateAdded, TableDateUpdated
):
    __tablename__ = "playlist_contributor"
    __table_args__ = ({"extend_existing": True},)

    playlist_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("default_schema.playlist.id"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id"), nullable=False
    )
    role_key: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("core.playlist_contributor_role_enum.key"),
        nullable=False,
    )

    playlist: Mapped["PlaylistRow"] = relationship(
        "PlaylistRow", back_populates="contributors"
    )

    role_enum: Mapped[PlaylistContributorRoleEnumRow] = relationship(
        PlaylistContributorRoleEnumRow, uselist=False
    )

    def __init__(self, playlist_id: int, user_id: int, role_key: int):
        kwargs: Dict[str, int] = {}
        kwargs["playlist_id"] = playlist_id
        kwargs["user_id"] = user_id
        kwargs["role_key"] = role_key
        for k, v in kwargs.items():
            setattr(self, k, v)
