from typing import Dict
from datetime import datetime
from sqlalchemy import BigInteger, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from core.access.db.base import CoreBase
from core.access.db.ormModels.declarativeMixin import TZAwareTimestamp


class ListeningProgressRow(CoreBase):
    __tablename__ = "listening_progress"
    __table_args__ = {"schema": "core", "extend_existing": True}
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id"), primary_key=True
    )
    session_id: Mapped[str] = mapped_column(String(36), nullable=False)
    session_ms: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    total_ms: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    playback_id: Mapped[str] = mapped_column(String, nullable=False)
    position_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    observed_at: Mapped[datetime] = mapped_column(TZAwareTimestamp, nullable=False)
    active_at: Mapped[datetime] = mapped_column(TZAwareTimestamp, nullable=False)

    def __init__(
        self,
        user_id: int,
        session_id: str,
        playback_id: str,
        observed_at: datetime,
        active_at: datetime,
        session_ms: int = 0,
        total_ms: int = 0,
        position_ms: int = 0,
    ):
        kwargs: Dict[str, datetime | int | str] = {}
        kwargs["user_id"] = user_id
        kwargs["session_id"] = session_id
        kwargs["playback_id"] = playback_id
        kwargs["observed_at"] = observed_at
        kwargs["active_at"] = active_at
        kwargs["session_ms"] = session_ms
        kwargs["total_ms"] = total_ms
        kwargs["position_ms"] = position_ms
        for k, v in kwargs.items():
            setattr(self, k, v)
