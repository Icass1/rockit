from typing import TYPE_CHECKING, Dict, List

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import mapped_column, relationship, Mapped

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
    TableAutoincrementId,
    TablePublicId,
)

if TYPE_CHECKING:
    from backend.core.access.db.ormModels.provider import ProviderRow
    from backend.core.access.db.ormEnums.mediaTypeEnum import MediaTypeEnumRow
    from backend.core.access.db.ormModels.user_queue import UserQueueRow


class CoreMediaRow(
    CoreBase, TableAutoincrementId, TablePublicId, TableDateUpdated, TableDateAdded
):
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
    media_type: Mapped[List["MediaTypeEnumRow"]] = relationship(
        "MediaTypeEnumRow", back_populates="media"
    )
    user_queues: Mapped[List["UserQueueRow"]] = relationship(
        "UserQueueRow", back_populates="media"
    )

    def __init__(self, public_id: str, provider_id: int, media_type_key: int):
        kwargs: Dict[str, int | str] = {}
        kwargs["public_id"] = public_id
        kwargs["provider_id"] = provider_id
        kwargs["media_type_key"] = media_type_key
        for k, v in kwargs.items():
            setattr(self, k, v)
