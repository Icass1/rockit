"""Provider-owned queries for local download metadata and files."""

from typing import Any

from sqlalchemy import literal, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from core.access.db.shared_metadata import shared_metadata
from core.access.providerStorage import MediaStorage, provider_storage
from core.utils.safeAsyncCall import safe_async
from result import Result, ResultCode


def playlist_metadata(with_images: bool) -> Select[Any]:
    table = shared_metadata.tables["youtube.playlist"]
    source = table
    image = table.c.image_id
    return select(
        table.c.id.label("id"),
        table.c.name.label("name"),
        (image if with_images else literal(None)).label("image_id"),
        table.c.youtube_id.label("external_id"),
        literal(False).label("manageable"),
    ).select_from(source)


def video_metadata(with_images: bool) -> Select[Any]:
    table = shared_metadata.tables["youtube.video"]
    source = table
    image = table.c.image_id
    return select(
        table.c.id.label("id"),
        table.c.name.label("name"),
        (image if with_images else literal(None)).label("image_id"),
        table.c.youtube_id.label("external_id"),
        literal(True).label("manageable"),
    ).select_from(source)


def video_files() -> Select[Any]:
    table = shared_metadata.tables["youtube.video"]
    return select(
        table.c.id.label("id"),
        table.c.video_path.label("path"),
        table.c.name.label("name"),
    )


@safe_async
async def clear_video_files(session: AsyncSession, media_ids: list[int]) -> Result[list[str]]:
    """Detach this provider's downloaded files in one batch."""
    table = shared_metadata.tables["youtube.video"]
    old = await session.execute(select(table.c.video_path).where(table.c.id.in_(media_ids)))
    paths = [path for path in old.scalars() if path]
    await session.execute(update(table).where(table.c.id.in_(media_ids)).values(video_path=None))
    return Result(code=ResultCode.OK, message="OK", result=paths)


provider_storage.register(
    MediaStorage(key="youtube.playlist", metadata_statement=playlist_metadata),
    MediaStorage(
        key="youtube.video",
        metadata_statement=video_metadata,
        files_statement=video_files,
        clear_files_async=clear_video_files,
    ),
)
