from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.access.db.base import CoreBase
from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
    TablePublicId,
)

if TYPE_CHECKING:
    from core.access.db.ormEnums.mediaTypeEnum import MediaTypeEnumRow


class PendingUploadRow(
    CoreBase, TableAutoincrementId, TablePublicId, TableDateUpdated, TableDateAdded
):
    __tablename__ = "pending_upload"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.user.id"), nullable=False)
    media_type_key: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.media_type_enum.key"), nullable=False
    )
    metadata_json: Mapped[str] = mapped_column(Text, nullable=False)
    cover_uploaded: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    uploaded_song_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    media_type: Mapped["MediaTypeEnumRow"] = relationship("MediaTypeEnumRow", uselist=False)

    def __init__(
        self,
        user_id: int,
        media_type_key: int,
        metadata_json: str,
        public_id: str | None = None,
        cover_uploaded: bool = False,
        uploaded_song_count: int = 0,
        id: int | None = None,
    ) -> None:
        kwargs: dict[str, None | bool | int | str] = {}
        kwargs["user_id"] = user_id
        kwargs["media_type_key"] = media_type_key
        kwargs["metadata_json"] = metadata_json
        if public_id is not None:
            kwargs["public_id"] = public_id
        kwargs["cover_uploaded"] = cover_uploaded
        kwargs["uploaded_song_count"] = uploaded_song_count
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
