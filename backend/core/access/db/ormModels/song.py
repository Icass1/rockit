

from backend.core.access.db.base import Base
from backend.core.access.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId


class SongRow(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'song'
    __table_args__ = {'schema': 'core', 'extend_existing': True},
