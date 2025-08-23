from sqlalchemy import Table, Column, ForeignKey

from backend.db.associationTables.generalColumns import date_added_column, date_updated_column
from backend.db.base import Base

playlist_external_images =  Table(
    'playlist_external_images',
    Base.metadata,
    Column('playlist_id', ForeignKey(
        'main.playlists.id'), primary_key=True),
    Column('external_image_id', ForeignKey(
        'main.external_images.id'), primary_key=True),
    date_added_column(),
    date_updated_column(),
    schema='main'
)
