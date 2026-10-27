from typing import Any

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column

from core.access.db.base import CoreBase
from core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
)


class ExternalRecommendationCacheRow(CoreBase, TableDateUpdated, TableDateAdded):
    """Successful responses from external recommendation providers, keyed by
    "{provider}|{context}" (see each provider's cache_key). Only successful
    answers are stored; failures are never cached. date_updated drives the
    TTL check."""

    __tablename__ = "cache_external_recommendation"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)

    def __init__(self, id: str, json: dict[str, Any]) -> None:
        kwargs: dict[str, dict[str, Any] | str] = {}
        kwargs["id"] = id
        kwargs["json"] = json
        for k, v in kwargs.items():
            setattr(self, k, v)
