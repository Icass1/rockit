from sqlalchemy import Table, Column, ForeignKey

from backend.db.base import Base

from backend.db.associationTables.generalColumns import date_added_column, date_updated_column

user_liked_songs = Table(
    'user_liked_songs', Base.metadata,
    Column('user_id', ForeignKey('users.id'), primary_key=True),
    Column('song_id', ForeignKey('songs.id'), primary_key=True),
    date_added_column(),
    date_updated_column(),
    schema='main'
)
