from sqlalchemy import Table, Column, ForeignKey

from backend.db.base import Base

from backend.db.associationTables.generalColumns import date_added_column, date_updated_column

album_copyrights = Table(
    'album_copyrights', Base.metadata,
    Column('album_id', ForeignKey('main.albums.id'), primary_key=True),
    Column('copyright_id', ForeignKey('main.copyrights.id'), primary_key=True),
    date_added_column(),
    date_updated_column(),
    schema='main'
)