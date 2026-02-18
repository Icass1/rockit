from typing import TYPE_CHECKING

from backend.core.access.db.base import Base
from backend.core.access.db.enums.baseEnum import BaseEnumRow

from sqlalchemy.orm import Mapped, relationship

if TYPE_CHECKING:
    from backend.core.access.db.ormModels.user import UserRow


class RepeatSongEnumRow(Base, BaseEnumRow):
    __tablename__ = 'repeat_song_enum'
    __table_args__ = {'schema': 'core', 'extend_existing': True},

    user: Mapped["UserRow"] = relationship(
        "UserRow",
        back_populates="repeat_song_enum"
    )
