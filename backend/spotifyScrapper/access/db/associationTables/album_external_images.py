from sqlalchemy import Table, Column, ForeignKey

from backend.spotifyScrapper.access.db.base import SpotifyScrapperBase

from backend.core.access.db.associationTables.generalColumns import (
    date_added_column,
    date_updated_column,
)

album_external_images = Table(
    "album_external_image",
    SpotifyScrapperBase.metadata,
    Column[int]("album_id", ForeignKey("spotify_scrapper.album.id"), primary_key=True),
    Column[int](
        "external_image_id",
        ForeignKey(column="spotify_scrapper.external_image.id"),
        primary_key=True,
    ),
    date_added_column(),
    date_updated_column(),
    schema="spotify_scrapper",
)
