from sqlalchemy import Table, Column, ForeignKey


from backend.spotifyScrapper.access.db.base import SpotifyScrapperBase

from backend.core.access.db.associationTables.generalColumns import (
    date_added_column,
    date_updated_column,
)

artist_genres = Table(
    "artist_genre",
    SpotifyScrapperBase.metadata,
    Column[int](
        "artist_id", ForeignKey("spotify_scrapper.artist.id"), primary_key=True
    ),
    Column[int](
        "genre_id", ForeignKey(column="spotify_scrapper.genre.id"), primary_key=True
    ),
    date_added_column(),
    date_updated_column(),
    schema="spotify_scrapper",
)
