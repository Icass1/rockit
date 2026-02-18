from sqlalchemy import Table, Column, ForeignKey

from backend.spotify.access.db.base import SpotifyBase

from backend.core.access.db.associationTables.generalColumns import date_added_column, date_updated_column

playlist_external_images = Table(
    'playlist_external_image',
    SpotifyBase.metadata,
    Column[int](
        'playlist_id',
        ForeignKey('spotify.playlist.id'),
        primary_key=True),
    Column[int](
        'external_image_id',
        ForeignKey('spotify.external_image.id'),
        primary_key=True),
    date_added_column(),
    date_updated_column(),
    schema='spotify'
)
