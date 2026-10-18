from typing import Dict

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import mapped_column, Mapped

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
)


class UserRecommendationSettingsRow(CoreBase, TableDateUpdated, TableDateAdded):
    """Per-user, opt-in settings for external recommendations. Kept in its
    own table (instead of new columns on core.user) so existing databases
    pick it up through create_all without a migration. A user without a row
    has external recommendations disabled."""

    __tablename__ = "user_recommendation_settings"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id"), primary_key=True
    )
    external_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    listenbrainz_username: Mapped[str | None] = mapped_column(String, nullable=True)

    def __init__(
        self,
        user_id: int,
        external_enabled: bool = False,
        listenbrainz_username: str | None = None,
    ):
        kwargs: Dict[str, None | bool | int | str] = {}
        kwargs["user_id"] = user_id
        kwargs["external_enabled"] = external_enabled
        kwargs["listenbrainz_username"] = listenbrainz_username
        for k, v in kwargs.items():
            setattr(self, k, v)
