"""Local catalog shape and membership rules owned by this provider."""

from typing import Any

from sqlalchemy import Integer, String, literal, select, union_all
from sqlalchemy.sql import Select
from sqlalchemy.sql.selectable import CompoundSelect

from core.access.collectionCatalog import CollectionCatalogSource, collection_catalog
from core.access.db.shared_metadata import shared_metadata


def metadata() -> Select[Any] | CompoundSelect[Any]:
    """Project names and artwork without loading collection contents."""
    playlist = shared_metadata.tables["youtube.playlist"]
    video = shared_metadata.tables["youtube.video"]
    channel = shared_metadata.tables["youtube.channel"]
    return union_all(
        select(
            playlist.c.id.label("id"),
            playlist.c.name.label("name"),
            playlist.c.image_id.label("image_id"),
        ),
        select(
            video.c.id.label("id"), video.c.name.label("name"), video.c.image_id.label("image_id")
        ),
        select(
            channel.c.id.label("id"),
            channel.c.name.label("name"),
            channel.c.image_id.label("image_id"),
        ),
    )


def edges(user_id: int) -> Select[Any] | CompoundSelect[Any]:
    """Project provider membership, order and disabled-item policy."""
    members = shared_metadata.tables["youtube.playlist_video"]
    return select(
        members.c.playlist_id.label("parent_id"),
        members.c.video_id.label("media_id"),
        members.c.video_id.label("position"),
        members.c.added_at.label("added_at"),
    ).where(members.c.disabled.is_(False))


def details() -> Select[Any] | CompoundSelect[Any]:
    """Project neutral collection summaries in a fixed column order."""
    playlist = shared_metadata.tables["youtube.playlist"]
    return select(
        playlist.c.id.label("id"),
        playlist.c.image_id.label("image_id"),
        playlist.c.youtube_id.label("external_id"),
        literal(None, String).label("release_date"),
        playlist.c.description.label("description"),
        literal(None, Integer).label("owner_id"),
        playlist.c.owner.label("owner"),
    )


collection_catalog.register(
    CollectionCatalogSource(key="youtube", metadata=metadata, edges=edges, details=details)
)
