"""Provider-owned queries for local download metadata and files."""

from typing import Any

from sqlalchemy import literal, select
from sqlalchemy.sql import Select

from backend.core.access.db.shared_metadata import shared_metadata
from backend.core.access.providerStorage import MediaStorage, provider_storage


def album_metadata(with_images: bool) -> Select[Any]:
    table = shared_metadata.tables["rockit.album"]
    source = table
    image = table.c.image_id
    return select(
        table.c.id.label("id"),
        table.c.name.label("name"),
        (image if with_images else literal(None)).label("image_id"),
        literal(None).label("external_id"),
        literal(False).label("manageable"),
    ).select_from(source)


def song_metadata(with_images: bool) -> Select[Any]:
    table = shared_metadata.tables["rockit.song"]
    source = table
    image = table.c.image_id
    return select(
        table.c.id.label("id"),
        table.c.name.label("name"),
        (image if with_images else literal(None)).label("image_id"),
        literal(None).label("external_id"),
        literal(False).label("manageable"),
    ).select_from(source)


def song_files() -> Select[Any]:
    table = shared_metadata.tables["rockit.song"]
    return select(
        table.c.id.label("id"),
        table.c.file_path.label("path"),
        table.c.name.label("name"),
    )


def video_metadata(with_images: bool) -> Select[Any]:
    table = shared_metadata.tables["rockit.video"]
    source = table
    image = table.c.image_id
    return select(
        table.c.id.label("id"),
        table.c.name.label("name"),
        (image if with_images else literal(None)).label("image_id"),
        literal(None).label("external_id"),
        literal(False).label("manageable"),
    ).select_from(source)


def video_files() -> Select[Any]:
    table = shared_metadata.tables["rockit.video"]
    return select(
        table.c.id.label("id"),
        table.c.file_path.label("path"),
        table.c.name.label("name"),
    )


provider_storage.register(
    MediaStorage(key="rockit.album", metadata_statement=album_metadata),
    MediaStorage(
        key="rockit.song", metadata_statement=song_metadata, files_statement=song_files
    ),
    MediaStorage(
        key="rockit.video",
        metadata_statement=video_metadata,
        files_statement=video_files,
    ),
)
