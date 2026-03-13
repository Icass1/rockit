from typing import List, TYPE_CHECKING, Dict

from sqlalchemy import DOUBLE_PRECISION, ForeignKey, String, Integer, Boolean
from sqlalchemy.orm import mapped_column, relationship, Mapped

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
    TableAutoincrementId,
    TablePublicId,
)

if TYPE_CHECKING:
    from backend.core.access.db.ormModels.error import ErrorRow
    from backend.core.access.db.ormModels.image import ImageRow
    from backend.core.access.db.ormModels.session import SessionRow
    from backend.core.access.db.ormModels.language import LanguageRow
    from backend.core.access.db.ormModels.user_queue import UserQueueRow
    from backend.core.access.db.ormModels.requestLog import RequestLogRow
    from backend.core.access.db.ormEnums.repeatModeEnum import RepeatModeEnumRow
    from backend.core.access.db.ormModels.user_library_media import UserLibraryMediaRow


class UserRow(
    CoreBase, TableAutoincrementId, TablePublicId, TableDateUpdated, TableDateAdded
):
    __tablename__ = "user"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    username: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    password_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    provider: Mapped[str | None] = mapped_column(String, nullable=True)
    provider_account_id: Mapped[str | None] = mapped_column(String, nullable=True)
    current_station: Mapped[str | None] = mapped_column(String, nullable=True)
    current_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    current_queue_media_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    queue_type_key: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.queue_type_enum.key"), nullable=False, default=2
    )
    repeat_mode_key: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.repeat_mode_enum.key"), nullable=False, default=1
    )
    volume: Mapped[float] = mapped_column(DOUBLE_PRECISION, nullable=False, default=1)
    cross_fade_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    lang_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.language.id"), nullable=False, default=1
    )
    admin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    super_admin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    image_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.image.id"), nullable=False
    )

    image: Mapped["ImageRow"] = relationship("ImageRow", lazy="selectin", uselist=False)
    language: Mapped["LanguageRow"] = relationship(
        "LanguageRow", back_populates=None, uselist=False, lazy="selectin"
    )

    repeat_mode_enum: Mapped["RepeatModeEnumRow"] = relationship(
        "RepeatModeEnumRow", back_populates="user", uselist=False
    )

    # one-to-many
    sessions: Mapped[List["SessionRow"]] = relationship(
        "SessionRow", back_populates="user"
    )
    errors: Mapped[List["ErrorRow"]] = relationship("ErrorRow", back_populates="user")
    request_logs: Mapped[List["RequestLogRow"]] = relationship(
        "RequestLogRow", back_populates="user"
    )
    user_library_medias: Mapped[List["UserLibraryMediaRow"]] = relationship(
        "UserLibraryMediaRow", back_populates="user"
    )
    user_queues: Mapped[List["UserQueueRow"]] = relationship(
        "UserQueueRow", back_populates="user"
    )

    def __init__(
        self,
        public_id: str,
        username: str,
        image_id: int,
        password_hash: str | None = None,
        provider: str | None = None,
        provider_account_id: str | None = None,
        current_station: str | None = None,
        current_time_ms: int | None = None,
        current_queue_media_id: int | None = None,
        queue_type_key: int = 2,
        repeat_mode_key: int = 1,
        volume: float = 1,
        cross_fade_ms: int = 0,
        lang_id: int = 1,
        admin: bool = False,
        super_admin: bool = False,
    ):
        kwargs: Dict[str, None | bool | float | int | str] = {}
        kwargs["public_id"] = public_id
        kwargs["username"] = username
        kwargs["image_id"] = image_id
        kwargs["password_hash"] = password_hash
        kwargs["provider"] = provider
        kwargs["provider_account_id"] = provider_account_id
        kwargs["current_station"] = current_station
        kwargs["current_time_ms"] = current_time_ms
        kwargs["current_queue_media_id"] = current_queue_media_id
        kwargs["queue_type_key"] = queue_type_key
        kwargs["repeat_mode_key"] = repeat_mode_key
        kwargs["volume"] = volume
        kwargs["cross_fade_ms"] = cross_fade_ms
        kwargs["lang_id"] = lang_id
        kwargs["admin"] = admin
        kwargs["super_admin"] = super_admin
        for k, v in kwargs.items():
            setattr(self, k, v)
