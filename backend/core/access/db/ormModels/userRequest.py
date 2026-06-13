from datetime import datetime

from sqlalchemy import ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
    TablePublicId,
)


class UserRequestRow(
    CoreBase, TableAutoincrementId, TablePublicId, TableDateUpdated, TableDateAdded
):
    __tablename__ = "user_request"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id"), nullable=False
    )
    media_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("core.media.id"), nullable=True
    )
    request_type_key: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.request_type_enum.key"), nullable=False
    )
    proposed_value: Mapped[str] = mapped_column(Text, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    status_key: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.request_status_enum.key"), nullable=False, default=1
    )
    reviewed_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("core.user.id"), nullable=True
    )
    review_comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __init__(
        self,
        public_id: str,
        user_id: int,
        request_type_key: int,
        proposed_value: str,
        media_id: int | None = None,
        comment: str | None = None,
        status_key: int = 1,
        reviewed_by: int | None = None,
        review_comment: str | None = None,
    ):
        kwargs: Dict[str, None | int | str] = {}
        kwargs["public_id"] = public_id
        kwargs["user_id"] = user_id
        kwargs["request_type_key"] = request_type_key
        kwargs["proposed_value"] = proposed_value
        kwargs["media_id"] = media_id
        kwargs["comment"] = comment
        kwargs["status_key"] = status_key
        kwargs["reviewed_by"] = reviewed_by
        kwargs["review_comment"] = review_comment
        for k, v in kwargs.items():
            setattr(self, k, v)
