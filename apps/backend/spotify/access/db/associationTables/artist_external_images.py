from sqlalchemy import Table, Column, ForeignKey

from backend.core.access.db.associationTables.generalColumns import (
    date_added_column,
    date_updated_column,
)

from backend.spotify.access.db.base import SpotifyBase

artist_external_images = Table(
    "artist_external_image",
    SpotifyBase.metadata,
    Column[int]("artist_id", ForeignKey("spotify.artist.id"), primary_key=True),
    Column[int](
        "external_image_id", ForeignKey("spotify.external_image.id"), primary_key=True
    ),
    date_added_column(),
    date_updated_column(),
    schema="spotify",
)
