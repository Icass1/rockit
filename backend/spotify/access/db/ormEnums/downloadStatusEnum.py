
from backend.core.access.db.base import Base
from backend.core.access.db.ormEnums.baseEnum import BaseEnumRow


class DownloadStatusEnumRow(Base, BaseEnumRow):
    __tablename__ = 'download_status_enum'
    __table_args__ = {'schema': 'spotify', 'extend_existing': True},
