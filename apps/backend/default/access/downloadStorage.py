"""Provider-owned queries for local download metadata and files."""

from typing import Any

from sqlalchemy import literal, select
from sqlalchemy.sql import Select

from core.access.db.shared_metadata import shared_metadata
from core.access.providerStorage import MediaStorage, provider_storage


def playlist_metadata(with_images: bool) -> Select[Any]:
    table = shared_metadata.tables["default_schema.playlist"]
    source = table
    image = table.c.image_id
    return select(
        table.c.id.label("id"),
        table.c.name.label("name"),
        (image if with_images else literal(None)).label("image_id"),
        literal(None).label("external_id"),
        literal(False).label("manageable"),
    ).select_from(source)


provider_storage.register(
    MediaStorage(key="default_schema.playlist", metadata_statement=playlist_metadata),
)
