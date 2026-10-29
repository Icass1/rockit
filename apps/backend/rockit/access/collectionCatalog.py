"""Local catalog shape and membership rules owned by this provider."""

from typing import Any

from sqlalchemy import Integer, String, literal, select, union_all
from sqlalchemy.sql import Select
from sqlalchemy.sql.selectable import CompoundSelect

from core.access.collectionCatalog import CollectionCatalogSource, collection_catalog
from core.access.db.shared_metadata import shared_metadata


def metadata() -> Select[Any] | CompoundSelect[Any]:
    """Project names and artwork without loading collection contents."""
    album = shared_metadata.tables["rockit.album"]
    song = shared_metadata.tables["rockit.song"]
    video = shared_metadata.tables["rockit.video"]
    return union_all(
        select(
            album.c.id.label("id"), album.c.name.label("name"), album.c.image_id.label("image_id")
        ),
        select(song.c.id.label("id"), song.c.name.label("name"), song.c.image_id.label("image_id")),
        select(
            video.c.id.label("id"), video.c.name.label("name"), video.c.image_id.label("image_id")
        ),
    )


def edges(user_id: int) -> Select[Any] | CompoundSelect[Any]:
    """Project provider membership, order and disabled-item policy."""
    tracks = shared_metadata.tables["rockit.song"]
    return select(
        tracks.c.album_id.label("parent_id"),
        tracks.c.id.label("media_id"),
        (tracks.c.disc_number * 1000000 + tracks.c.track_number).label("position"),
        tracks.c.date_added.label("added_at"),
    ).where(tracks.c.album_id.is_not(None))


def details() -> Select[Any] | CompoundSelect[Any]:
    """Project neutral collection summaries in a fixed column order."""
    album = shared_metadata.tables["rockit.album"]
    return select(
        album.c.id.label("id"),
        album.c.image_id.label("image_id"),
        literal(None, String).label("external_id"),
        album.c.release_date.label("release_date"),
        literal(None, String).label("description"),
        literal(None, Integer).label("owner_id"),
        literal(None, String).label("owner"),
    )


def artists() -> Select[Any] | CompoundSelect[Any]:
    """Project album artist relationships using this provider's schema."""
    links = shared_metadata.tables["rockit.album_artists"]
    artist = shared_metadata.tables["rockit.artist"]
    return select(
        links.c.album_id.label("parent_id"),
        artist.c.id.label("artist_id"),
        artist.c.name.label("name"),
        artist.c.image_id.label("image_id"),
        literal("rockit").label("provider"),
    ).join(artist, artist.c.id == links.c.artist_id)


collection_catalog.register(
    CollectionCatalogSource(
        key="rockit", metadata=metadata, edges=edges, details=details, artists=artists
    )
)
