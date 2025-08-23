from sqlalchemy import Table, Column, ForeignKey

from backend.db.base import Base

from backend.db.associationTables.generalColumns import date_added_column, date_updated_column

artist_external_images = Table(
    'artist_external_images',
    Base.metadata,
    Column('artist_id', ForeignKey('main.artists.id'), primary_key=True),
    Column('external_image_id', ForeignKey(
        'main.external_images.id'), primary_key=True),
    date_added_column(),
    date_updated_column(),
    schema='main'
)