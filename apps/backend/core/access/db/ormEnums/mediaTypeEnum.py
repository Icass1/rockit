from typing import TYPE_CHECKING

from sqlalchemy.orm import Mapped, relationship

from core.access.db.base import CoreBase
from core.access.db.ormEnums.baseEnum import BaseEnumRow

if TYPE_CHECKING:
    from core.access.db.ormModels.media import CoreMediaRow


class MediaTypeEnumRow(CoreBase, BaseEnumRow):
    __tablename__ = "media_type_enum"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    media: Mapped["CoreMediaRow"] = relationship("CoreMediaRow", back_populates="media_type")
