from sqlalchemy import TIMESTAMP, Table, Column, ForeignKey

from backend.db.base import Base

from backend.db.associationTables.generalColumns import date_added_column, date_updated_column

user_liked_songs = Table(
    'user_liked_songs', Base.metadata,
    Column('user_id', ForeignKey('main.users.id'), primary_key=True),
    Column('song_id', ForeignKey('main.songs.id'), primary_key=True),
    Column("added_at", TIMESTAMP(timezone=True), nullable=False),
    date_added_column(),
    date_updated_column(),
    schema='main'
)
