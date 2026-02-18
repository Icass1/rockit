from sqlalchemy import Table, Column, ForeignKey

from backend.core.access.db.base import Base

from backend.core.access.db.associationTables.generalColumns import date_added_column, date_updated_column

album_copyrights = Table(
    'album_copyrights', Base.metadata,
    Column[int]('album_id', ForeignKey('spotify.albums.id'), primary_key=True),
    Column[int]('copyright_id', ForeignKey('spotify.copyrights.id'), primary_key=True),
    date_added_column(),
    date_updated_column(),
    schema='spotify'
)