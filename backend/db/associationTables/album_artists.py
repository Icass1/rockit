from sqlalchemy import Table, Column, ForeignKey

from backend.db.base import Base

from backend.db.associationTables.generalColumns import date_added_column, date_updated_column

album_artists = Table(
    'album_artists', Base.metadata,
    Column('album_id', ForeignKey('main.albums.id'), primary_key=True),
    Column('artist_id', ForeignKey('main.artists.id'), primary_key=True),
    date_added_column(),
    date_updated_column(),
    schema='main'
)