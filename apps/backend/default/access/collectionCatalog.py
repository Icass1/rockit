"""Local catalog shape and membership rules owned by this provider."""

from typing import Any

from sqlalchemy import String, literal, select
from sqlalchemy.sql import Select
from sqlalchemy.sql.selectable import CompoundSelect

from core.access.collectionCatalog import CollectionCatalogSource, collection_catalog
from core.access.db.shared_metadata import shared_metadata
from default.access.collectionSource import DefaultCollectionSource


def metadata() -> Select[Any] | CompoundSelect[Any]:
    """Project names and artwork without loading collection contents."""
    playlist = shared_metadata.tables["default_schema.playlist"]
    return select(
        playlist.c.id.label("id"),
        playlist.c.name.label("name"),
        playlist.c.image_id.label("image_id"),
    )


def edges(user_id: int) -> Select[Any] | CompoundSelect[Any]:
    """Project provider membership, order and disabled-item policy."""
    members = shared_metadata.tables["default_schema.playlist_media"]
    return DefaultCollectionSource.filter_edges(
        select(
            members.c.playlist_id.label("parent_id"),
            members.c.media_id.label("media_id"),
            members.c.position.label("position"),
            members.c.date_added.label("added_at"),
        ),
        members,
        user_id,
    )


def details() -> Select[Any] | CompoundSelect[Any]:
    """Project neutral collection summaries in a fixed column order."""
    playlist = shared_metadata.tables["default_schema.playlist"]
    return select(
        playlist.c.id.label("id"),
        playlist.c.image_id.label("image_id"),
        literal(None, String).label("external_id"),
        literal(None, String).label("release_date"),
        playlist.c.description.label("description"),
        playlist.c.owner_id.label("owner_id"),
        literal(None, String).label("owner"),
    )


collection_catalog.register(
    CollectionCatalogSource(key="default", metadata=metadata, edges=edges, details=details)
)
