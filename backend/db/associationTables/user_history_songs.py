from sqlalchemy import Table, Column, ForeignKey, DateTime

from backend.db.base import Base

from backend.db.associationTables.generalColumns import date_added_column, date_updated_column

user_history_songs = Table(
    'user_history_songs', Base.metadata,
    Column('user_id', ForeignKey('users.id'), primary_key=True),
    Column('song_id', ForeignKey('songs.id'), primary_key=True),
    Column('played_at', DateTime(timezone=False),
           nullable=False, primary_key=True),
    date_added_column(),
    date_updated_column(),
    schema='main'
)
