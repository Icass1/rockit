
from sqlalchemy import Table, Column, ForeignKey

from backend.db.base import Base

from backend.db.associationTables.generalColumns import date_added_column, date_updated_column


user_pinned_lists = Table(
    'user_pinned_lists', Base.metadata,
    Column('user_id', ForeignKey('main.users.id'), primary_key=True),
    Column('list_id', ForeignKey('main.lists.id'), primary_key=True),
    date_added_column(),
    date_updated_column(),
    schema='main'
)
