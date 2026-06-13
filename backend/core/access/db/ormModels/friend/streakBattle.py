from typing import TYPE_CHECKING, Dict

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import mapped_column, relationship, Mapped

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TablePublicId,
)

if TYPE_CHECKING:
    from backend.core.access.db.ormModels.user import UserRow


class StreakBattleRow(
    CoreBase, TableAutoincrementId, TablePublicId, TableDateAdded
):
    __tablename__ = "streak_battle"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    challenger_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id"), nullable=False
    )
    challenged_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id"), nullable=False
    )
    winner_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("core.user.id"), nullable=True
    )
    status_key: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.friend_status_enum.key"), nullable=False, default=1
    )

    challenger: Mapped["UserRow"] = relationship(
        "UserRow", foreign_keys=[challenger_id], lazy="selectin"
    )
    challenged: Mapped["UserRow"] = relationship(
        "UserRow", foreign_keys=[challenged_id], lazy="selectin"
    )

    def __init__(
        self,
        public_id: str,
        challenger_id: int,
        challenged_id: int,
        winner_id: int | None = None,
        status_key: int = 1,
    ):
        kwargs: Dict[str, int | str | None] = {}
        kwargs["public_id"] = public_id
        kwargs["challenger_id"] = challenger_id
        kwargs["challenged_id"] = challenged_id
        kwargs["winner_id"] = winner_id
        kwargs["status_key"] = status_key
        for k, v in kwargs.items():
            setattr(self, k, v)
