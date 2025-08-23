from sqlalchemy import Table, Column, ForeignKey

from backend.db.base import Base

from backend.db.associationTables.generalColumns import date_added_column, date_updated_column


album_external_images = Table(
    'album_external_images',
    Base.metadata,
    Column('album_id', ForeignKey('main.albums.id'), primary_key=True),
    Column('external_image_id', ForeignKey(
        column='main.external_images.id'), primary_key=True),
    date_added_column(),
    date_updated_column(),
    schema='main'
)
