from sqlalchemy import Table, Column, ForeignKey

from backend.core.access.db.associationTables.generalColumns import (
    date_added_column,
    date_updated_column,
)

from backend.spotifyScrapper.access.db.base import SpotifyScrapperBase

album_copyrights = Table(
    "album_copyright",
    SpotifyScrapperBase.metadata,
    Column[int]("album_id", ForeignKey("spotify_scrapper.album.id"), primary_key=True),
    Column[int](
        "copyright_id", ForeignKey("spotify_scrapper.copyright.id"), primary_key=True
    ),
    date_added_column(),
    date_updated_column(),
    schema="spotify_scrapper",
)
