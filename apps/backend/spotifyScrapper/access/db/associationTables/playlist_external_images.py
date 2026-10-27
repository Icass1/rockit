from sqlalchemy import Column, ForeignKey, Table

from core.access.db.associationTables.generalColumns import (
    date_added_column,
    date_updated_column,
)
from spotifyScrapper.access.db.base import SpotifyScrapperBase

playlist_external_images = Table(
    "playlist_external_image",
    SpotifyScrapperBase.metadata,
    Column[int]("playlist_id", ForeignKey("spotify_scrapper.playlist.id"), primary_key=True),
    Column[int](
        "external_image_id",
        ForeignKey("spotify_scrapper.external_image.id"),
        primary_key=True,
    ),
    date_added_column(),
    date_updated_column(),
    schema="spotify_scrapper",
)
