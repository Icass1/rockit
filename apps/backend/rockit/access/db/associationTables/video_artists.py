from sqlalchemy import ForeignKey, Integer, Table, Column

from backend.core.access.db.associationTables.generalColumns import (
    date_added_column,
    date_updated_column,
)

from backend.rockit.access.db.base import RockitBase

video_artists = Table(
    "video_artists",
    RockitBase.metadata,
    Column("video_id", Integer, ForeignKey("rockit.video.id"), primary_key=True),
    Column("artist_id", Integer, ForeignKey("rockit.artist.id"), primary_key=True),
    date_added_column(),
    date_updated_column(),
    schema="rockit",
)
