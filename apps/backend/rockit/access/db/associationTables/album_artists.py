from sqlalchemy import Column, ForeignKey, Integer, Table

from core.access.db.associationTables.generalColumns import (
    date_added_column,
    date_updated_column,
)
from rockit.access.db.base import RockitBase

album_artists = Table(
    "album_artists",
    RockitBase.metadata,
    Column("album_id", Integer, ForeignKey("rockit.album.id"), primary_key=True),
    Column("artist_id", Integer, ForeignKey("rockit.artist.id"), primary_key=True),
    date_added_column(),
    date_updated_column(),
    schema="rockit",
)
