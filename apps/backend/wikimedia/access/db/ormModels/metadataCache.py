from datetime import datetime
from typing import Any

from sqlalchemy import TIMESTAMP, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from wikimedia.access.db.base import WikimediaBase


class MetadataCacheRow(WikimediaBase):
    __tablename__ = "metadata_cache"
    __table_args__ = {"schema": "wikimedia"}

    key: Mapped[str] = mapped_column(String, primary_key=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)

    def __init__(self, key: str, payload: dict[str, Any], fetched_at: datetime) -> None:
        kwargs: dict[str, datetime | dict[str, Any] | str] = {}
        kwargs["key"] = key
        kwargs["payload"] = payload
        kwargs["fetched_at"] = fetched_at
        for k, v in kwargs.items():
            setattr(self, k, v)
