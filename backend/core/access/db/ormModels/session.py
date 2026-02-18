from typing import TYPE_CHECKING, Dict
from datetime import datetime

from sqlalchemy import TIMESTAMP, Boolean, ForeignKey,  String, Integer
from sqlalchemy.orm import mapped_column, relationship, Mapped

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId

if TYPE_CHECKING:
    from backend.core.access.db.ormModels.user import UserRow


class SessionRow(CoreBase, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'session'
    __table_args__ = {'schema': 'core', 'extend_existing': True},

    session_id: Mapped[str] = mapped_column(
        String,
        nullable=False,
        unique=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey('core.user.id'),
        nullable=False)
    disabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False)
    expires_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        unique=True)

    user: Mapped["UserRow"] = relationship(
        "UserRow",
        back_populates="sessions",
        foreign_keys=[user_id])

    def __init__(self, session_id: str, user_id: int, expires_at: datetime, disabled: bool = False):
        kwargs: Dict[str, bool | datetime | int | str] = {}
        kwargs['session_id'] = session_id
        kwargs['user_id'] = user_id
        kwargs['expires_at'] = expires_at
        kwargs['disabled'] = disabled
        for k, v in kwargs.items():
            setattr(self, k, v)
