from sqlalchemy import Table, Column, ForeignKey

from backend.core.access.db.base import Base

from backend.core.access.db.associationTables.generalColumns import date_added_column, date_updated_column

artist_external_images = Table(
    'artist_external_images',
    Base.metadata,
    Column[int]('artist_id', ForeignKey(
        'spotify.artists.id'), primary_key=True),
    Column[int]('external_image_id', ForeignKey(
        'spotify.external_images.id'), primary_key=True),
    date_added_column(),
    date_updated_column(),
    schema='spotify'
)
