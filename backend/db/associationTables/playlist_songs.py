from sqlalchemy import Table, Column, ForeignKey, Boolean, String

from backend.db.base import Base

from backend.db.associationTables.generalColumns import date_added_column, date_updated_column

playlist_songs = Table(
    'playlist_songs',
    Base.metadata,
    Column('playlist_id', ForeignKey('main.playlists.id'), primary_key=True),
    Column('song_id', ForeignKey('main.songs.id'), primary_key=True),
    Column("added_by", String, nullable=True),
    Column("disabled", Boolean, nullable=False),
    date_added_column(),
    date_updated_column(),
    schema='main'
)
