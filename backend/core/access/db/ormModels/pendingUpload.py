from typing import TYPE_CHECKING, Dict

from sqlalchemy import Boolean, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
    TablePublicId,
)

if TYPE_CHECKING:
    from backend.core.access.db.ormEnums.mediaTypeEnum import MediaTypeEnumRow


class PendingUploadRow(
    CoreBase, TableAutoincrementId, TablePublicId, TableDateUpdated, TableDateAdded
):
    __tablename__ = "pending_upload"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.user.id"), nullable=False
    )
    media_type_key: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.media_type_enum.key"), nullable=False
    )
    metadata_json: Mapped[str] = mapped_column(Text, nullable=False)
    cover_uploaded: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    uploaded_song_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    media_type: Mapped["MediaTypeEnumRow"] = relationship(
        "MediaTypeEnumRow", uselist=False
    )

    def __init__(
        self,
        public_id: str,
        user_id: int,
        media_type_key: int,
        metadata_json: str,
        cover_uploaded: bool = False,
        uploaded_song_count: int = 0,
    ):
        kwargs: Dict[str, bool | int | str] = {}
        kwargs["public_id"] = public_id
        kwargs["user_id"] = user_id
        kwargs["media_type_key"] = media_type_key
        kwargs["metadata_json"] = metadata_json
        kwargs["cover_uploaded"] = cover_uploaded
        kwargs["uploaded_song_count"] = uploaded_song_count
        for k, v in kwargs.items():
            setattr(self, k, v)
