from sqlalchemy import Table, Column, ForeignKey

from backend.core.access.db.associationTables.generalColumns import (
    date_added_column,
    date_updated_column,
)

from backend.youtube.access.db.base import YoutubeBase

playlist_external_images = Table(
    "playlist_external_image",
    YoutubeBase.metadata,
    Column[int]("playlist_id", ForeignKey("youtube.playlist.id"), primary_key=True),
    Column[int](
        "external_image_id",
        ForeignKey(column="youtube.external_image.id"),
        primary_key=True,
    ),
    date_added_column(),
    date_updated_column(),
    schema="youtube",
)
