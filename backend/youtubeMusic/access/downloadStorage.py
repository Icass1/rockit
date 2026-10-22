"""Provider-owned queries for local download metadata and files."""

from typing import Any

from sqlalchemy import literal, select, update
from sqlalchemy.sql import Select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.utils.safeAsyncCall import safe_async
from backend.core.access.db.shared_metadata import shared_metadata
from backend.core.access.providerStorage import MediaStorage, provider_storage


def album_metadata(with_images: bool) -> Select[Any]:
    table = shared_metadata.tables["youtube_music.album"]
    source = table
    image = table.c.image_id
    return select(
        table.c.id.label("id"),
        table.c.title.label("name"),
        (image if with_images else literal(None)).label("image_id"),
        table.c.youtube_id.label("external_id"),
        literal(False).label("manageable"),
    ).select_from(source)


def playlist_metadata(with_images: bool) -> Select[Any]:
    table = shared_metadata.tables["youtube_music.playlist"]
    source = table
    image = table.c.image_id
    return select(
        table.c.id.label("id"),
        table.c.name.label("name"),
        (image if with_images else literal(None)).label("image_id"),
        table.c.youtube_id.label("external_id"),
        literal(False).label("manageable"),
    ).select_from(source)


def track_metadata(with_images: bool) -> Select[Any]:
    table = shared_metadata.tables["youtube_music.track"]
    source = table
    image = table.c.image_id
    return select(
        table.c.id.label("id"),
        table.c.title.label("name"),
        (image if with_images else literal(None)).label("image_id"),
        table.c.youtube_id.label("external_id"),
        literal(True).label("manageable"),
    ).select_from(source)


def track_files() -> Select[Any]:
    table = shared_metadata.tables["youtube_music.track"]
    return select(
        table.c.id.label("id"), table.c.path.label("path"), table.c.title.label("name")
    )


@safe_async
async def clear_track_files(
    session: AsyncSession, media_ids: list[int]
) -> AResult[list[str]]:
    """Detach this provider's downloaded files in one batch."""
    table = shared_metadata.tables["youtube_music.track"]
    old = await session.execute(select(table.c.path).where(table.c.id.in_(media_ids)))
    paths = [path for path in old.scalars() if path]
    await session.execute(
        update(table).where(table.c.id.in_(media_ids)).values(path=None)
    )
    return AResult(code=AResultCode.OK, message="OK", result=paths)


provider_storage.register(
    MediaStorage(key="youtube_music.album", metadata_statement=album_metadata),
    MediaStorage(key="youtube_music.playlist", metadata_statement=playlist_metadata),
    MediaStorage(
        key="youtube_music.track",
        metadata_statement=track_metadata,
        files_statement=track_files,
        clear_files_async=clear_track_files,
    ),
)
