
from sqlalchemy import Table, Column, ForeignKey

from backend.db.base import Base

from backend.db.associationTables.generalColumns import date_added_column, date_updated_column


user_lists = Table(
    'user_lists', Base.metadata,
    Column('user_id', ForeignKey('users.id'), primary_key=True),
    Column('list_id', ForeignKey('lists.id'), primary_key=True),
    date_added_column(),
    date_updated_column(),
    schema='main'
)
