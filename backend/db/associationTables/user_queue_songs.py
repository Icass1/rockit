from sqlalchemy import Table, Column, ForeignKey, Enum, Integer

from backend.db.base import Base

from backend.db.associationTables.generalColumns import date_added_column, date_updated_column


user_queue_songs = Table(
    'user_queue_songs', Base.metadata,
    Column('user_id', ForeignKey('users.id'), primary_key=True),
    Column('song_id', ForeignKey('songs.id'), primary_key=True),
    Column('position', Integer, nullable=False),
    Column('list_type', Enum("album", "playlist", "carousel",
           "recently-played", "recent-mix", name="user_queue_songs_list_type_enum", schema="main"), nullable=False),
    Column('list_id', ForeignKey('lists.id'), nullable=True),
    date_added_column(),
    date_updated_column(),
    schema='main'
)
