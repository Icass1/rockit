from typing import TYPE_CHECKING

from sqlalchemy.orm import Mapped, relationship

from core.access.db.base import CoreBase
from core.access.db.ormEnums.baseEnum import BaseEnumRow

if TYPE_CHECKING:
    from core.access.db.ormModels.user import UserRow


class RepeatModeEnumRow(CoreBase, BaseEnumRow):
    __tablename__ = "repeat_mode_enum"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    user: Mapped["UserRow"] = relationship("UserRow", back_populates="repeat_mode_enum")
