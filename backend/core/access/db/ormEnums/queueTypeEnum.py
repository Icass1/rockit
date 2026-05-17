from typing import TYPE_CHECKING

from sqlalchemy.orm import relationship, Mapped

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormEnums.baseEnum import BaseEnumRow

if TYPE_CHECKING:
    from backend.core.access.db.ormModels.user import UserRow


class QueueTypeEnumRow(CoreBase, BaseEnumRow):
    __tablename__ = "queue_type_enum"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    user: Mapped["UserRow"] = relationship("UserRow", back_populates="queue_type_enum")
