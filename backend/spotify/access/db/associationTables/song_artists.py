from sqlalchemy import Table, Column, ForeignKey

from backend.core.access.db.base import Base

from backend.core.access.db.associationTables.generalColumns import date_added_column, date_updated_column

song_artists = Table(
    'track_artist', Base.metadata,
    Column[int]('track_id', ForeignKey('spotify.track.id'), primary_key=True),
    Column[int]('artist_id', ForeignKey('spotify.artist.id'), primary_key=True),
    date_added_column(),
    date_updated_column(),
    schema='spotify'
)