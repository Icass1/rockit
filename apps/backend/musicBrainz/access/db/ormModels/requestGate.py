from datetime import datetime

from sqlalchemy import TIMESTAMP, Integer
from sqlalchemy.orm import Mapped, mapped_column

from musicBrainz.access.db.base import MusicBrainzBase


class RequestGateRow(MusicBrainzBase):
    __tablename__ = "request_gate"
    __table_args__ = {"schema": "musicbrainz"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    available_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)

    def __init__(self, id: int, available_at: datetime) -> None:
        kwargs: dict[str, datetime | int] = {}
        kwargs["id"] = id
        kwargs["available_at"] = available_at
        for k, v in kwargs.items():
            setattr(self, k, v)
