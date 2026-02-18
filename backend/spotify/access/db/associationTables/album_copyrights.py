from sqlalchemy import Table, Column, ForeignKey

from backend.core.access.db.associationTables.generalColumns import date_added_column, date_updated_column

from backend.spotify.access.db.base import SpotifyBase


album_copyrights = Table(
    'album_copyright', SpotifyBase.metadata,
    Column[int]('album_id', ForeignKey('spotify.album.id'), primary_key=True),
    Column[int]('copyright_id', ForeignKey(
        'spotify.copyright.id'), primary_key=True),
    date_added_column(),
    date_updated_column(),
    schema='spotify'
)
