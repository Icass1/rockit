from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormEnums.baseEnum import BaseEnumRow


class DownloadStatusEnumRow(CoreBase, BaseEnumRow):
    __tablename__ = 'download_status_enum'
    __table_args__ = {'schema': 'core', 'extend_existing': True},
