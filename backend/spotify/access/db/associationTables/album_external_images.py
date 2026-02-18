from sqlalchemy import Table, Column, ForeignKey

from backend.core.access.db.base import Base

from backend.core.access.db.associationTables.generalColumns import date_added_column, date_updated_column


album_external_images = Table(
    'album_external_images',
    Base.metadata,
    Column[int]('album_id', ForeignKey('spotify.albums.id'), primary_key=True),
    Column[int]('external_image_id', ForeignKey(
        column='spotify.external_images.id'), primary_key=True),
    date_added_column(),
    date_updated_column(),
    schema='spotify'
)
