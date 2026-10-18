from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormEnums.baseEnum import BaseEnumRow


class RequestStatusEnumRow(CoreBase, BaseEnumRow):
    __tablename__ = "request_status_enum"
    __table_args__ = ({"schema": "core", "extend_existing": True},)
