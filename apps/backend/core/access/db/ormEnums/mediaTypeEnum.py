from typing import TYPE_CHECKING

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormEnums.baseEnum import BaseEnumRow

from sqlalchemy.orm import Mapped, relationship

if TYPE_CHECKING:
    from backend.core.access.db.ormModels.media import CoreMediaRow


class MediaTypeEnumRow(CoreBase, BaseEnumRow):
    __tablename__ = "media_type_enum"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    media: Mapped["CoreMediaRow"] = relationship(
        "CoreMediaRow", back_populates="media_type"
    )
