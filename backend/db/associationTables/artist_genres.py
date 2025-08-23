from sqlalchemy import Table, Column, ForeignKey

from backend.db.associationTables.generalColumns import date_added_column, date_updated_column
from backend.db.base import Base


artist_genres = Table(
    'artist_genres', Base.metadata,
    Column('artist_id', ForeignKey('artists.id'), primary_key=True),
    Column('genre_id', ForeignKey(column='genres.id'), primary_key=True),
    date_added_column(),
    date_updated_column(),
    schema='main'
)
