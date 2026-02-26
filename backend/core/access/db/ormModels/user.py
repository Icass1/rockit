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
    from backend.core.access.db.ormModels.session import SessionRow
    from backend.core.access.db.ormEnums.repeatSongEnum import RepeatSongEnumRow
    from backend.core.access.db.ormModels.user_album import UserAlbumRow


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
    current_time: Mapped[float | None] = mapped_column(DOUBLE_PRECISION, nullable=True)
    queue_song_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    random_queue: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    repeat_song_key: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.repeat_song_enum.key"), nullable=False, default=1
    )
    volume: Mapped[float] = mapped_column(DOUBLE_PRECISION, nullable=False, default=1)
    cross_fade: Mapped[float] = mapped_column(
        DOUBLE_PRECISION, nullable=False, default=0
    )
    lang: Mapped[str] = mapped_column(String, nullable=False, default="en")
    image: Mapped[str] = mapped_column(
        String, nullable=False, default="user-placeholder.png"
    )
    admin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    super_admin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    repeat_song_enum: Mapped["RepeatSongEnumRow"] = relationship(
        "RepeatSongEnumRow", back_populates="user", uselist=False
    )

    # one-to-many
    sessions: Mapped[List["SessionRow"]] = relationship(
        "SessionRow", back_populates="user"
    )
    errors: Mapped[List["ErrorRow"]] = relationship("ErrorRow", back_populates="user")
    user_albums: Mapped[List["UserAlbumRow"]] = relationship(
        "UserAlbumRow", back_populates="user"
    )

    def __init__(
        self,
        public_id: str,
        username: str,
        password_hash: str | None = None,
        provider: str | None = None,
        provider_account_id: str | None = None,
        current_station: str | None = None,
        current_time: float | None = None,
        queue_song_id: int | None = None,
        random_queue: bool = False,
        repeat_song_key: int = 1,
        volume: float = 1,
        cross_fade: float = 0,
        lang: str = "en",
        image: str = "user-placeholder.png",
        admin: bool = False,
        super_admin: bool = False,
    ):
        kwargs: Dict[str, None | bool | float | int | str] = {}
        kwargs["public_id"] = public_id
        kwargs["username"] = username
        kwargs["password_hash"] = password_hash
        kwargs["provider"] = provider
        kwargs["provider_account_id"] = provider_account_id
        kwargs["current_station"] = current_station
        kwargs["current_time"] = current_time
        kwargs["queue_song_id"] = queue_song_id
        kwargs["random_queue"] = random_queue
        kwargs["repeat_song_key"] = repeat_song_key
        kwargs["volume"] = volume
        kwargs["cross_fade"] = cross_fade
        kwargs["lang"] = lang
        kwargs["image"] = image
        kwargs["admin"] = admin
        kwargs["super_admin"] = super_admin
        for k, v in kwargs.items():
            setattr(self, k, v)
