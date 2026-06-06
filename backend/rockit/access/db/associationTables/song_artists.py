from sqlalchemy import ForeignKey, Integer, Table, Column

from backend.core.access.db.associationTables.generalColumns import (
    date_added_column,
    date_updated_column,
)

from backend.rockit.access.db.base import RockitBase

song_artists = Table(
    "song_artists",
    RockitBase.metadata,
    Column("song_id", Integer, ForeignKey("rockit.song.id"), primary_key=True),
    Column("artist_id", Integer, ForeignKey("rockit.artist.id"), primary_key=True),
    date_added_column(),
    date_updated_column(),
    schema="rockit",
)
