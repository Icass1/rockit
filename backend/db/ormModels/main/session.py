from typing import TYPE_CHECKING
from datetime import datetime

from sqlalchemy import TIMESTAMP, ForeignKey,  String, Integer
from sqlalchemy.orm import mapped_column, relationship, Mapped

from backend.db.base import Base
from backend.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId

if TYPE_CHECKING:
    from backend.db.ormModels.main.user import UserRow


class SessionRow(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'sessions'
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    session_id: Mapped[str] = mapped_column(
        String, nullable=False, unique=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey(
        'main.users.id'), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, nullable=False, unique=True)

    user: Mapped["UserRow"] = relationship("UserRow", back_populates="sessions",
                                           foreign_keys=[user_id])

    def __init__(self, session_id: str, user_id: int, expires_at: datetime):
        kwargs = {}
        kwargs['session_id'] = session_id
        kwargs['user_id'] = user_id
        kwargs['expires_at'] = expires_at
        for k, v in kwargs.items():
            setattr(self, k, v)
