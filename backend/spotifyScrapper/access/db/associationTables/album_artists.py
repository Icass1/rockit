from sqlalchemy import Table, Column, ForeignKey

from backend.core.access.db.associationTables.generalColumns import (
    date_added_column,
    date_updated_column,
)

from backend.spotifyScrapper.access.db.base import SpotifyScrapperBase

album_artists = Table(
    "album_artist",
    SpotifyScrapperBase.metadata,
    Column[int]("album_id", ForeignKey("spotify_scrapper.album.id"), primary_key=True),
    Column[int](
        "artist_id", ForeignKey("spotify_scrapper.artist.id"), primary_key=True
    ),
    date_added_column(),
    date_updated_column(),
    schema="spotify_scrapper",
)
