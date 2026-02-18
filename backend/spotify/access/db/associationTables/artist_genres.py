from sqlalchemy import Table, Column, ForeignKey


from backend.spotify.access.db.base import SpotifyBase

from backend.core.access.db.associationTables.generalColumns import date_added_column, date_updated_column


artist_genres = Table(
    'artist_genre', SpotifyBase.metadata,
    Column[int]('artist_id', ForeignKey('spotify.artist.id'), primary_key=True),
    Column[int]('genre_id', ForeignKey(column='spotify.genre.id'), primary_key=True),
    date_added_column(),
    date_updated_column(),
    schema='spotify'
)
