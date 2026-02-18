

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId


class CorePlaylistRow(CoreBase, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'playlist'
    __table_args__ = {'schema': 'core', 'extend_existing': True},
