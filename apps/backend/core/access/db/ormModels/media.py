from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer
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
    from core.access.db.ormModels.provider import ProviderRow
    from core.access.db.ormModels.user_library_media import UserLibraryMediaRow
    from core.access.db.ormModels.user_queue import UserQueueRow


class CoreMediaRow(CoreBase, TableAutoincrementId, TablePublicId, TableDateUpdated, TableDateAdded):
    __tablename__ = "media"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    provider_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.provider.id"), nullable=False
    )
    media_type_key: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.media_type_enum.key"), nullable=False
    )

    provider: Mapped["ProviderRow"] = relationship(
        "ProviderRow", back_populates="medias", uselist=False
    )
    media_type: Mapped[list["MediaTypeEnumRow"]] = relationship(
        "MediaTypeEnumRow", back_populates="media"
    )
    user_library_medias: Mapped[list["UserLibraryMediaRow"]] = relationship(
        "UserLibraryMediaRow", back_populates="media"
    )
    user_queues: Mapped[list["UserQueueRow"]] = relationship(
        "UserQueueRow", back_populates="media", foreign_keys="UserQueueRow.media_id"
    )

    def __init__(
        self,
        provider_id: int,
        media_type_key: int,
        public_id: str | None = None,
        id: int | None = None,
    ) -> None:
        kwargs: dict[str, None | int | str] = {}
        kwargs["provider_id"] = provider_id
        kwargs["media_type_key"] = media_type_key
        if public_id is not None:
            kwargs["public_id"] = public_id
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
