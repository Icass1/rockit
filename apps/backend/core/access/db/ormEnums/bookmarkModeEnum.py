from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormEnums.baseEnum import BaseEnumRow


class BookmarkModeEnumRow(CoreBase, BaseEnumRow):
    __tablename__ = "bookmark_mode_enum"
    __table_args__ = ({"schema": "core", "extend_existing": True},)
