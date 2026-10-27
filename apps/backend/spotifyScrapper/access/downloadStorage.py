"""Provider-owned queries for local download metadata and files."""

from typing import Any

from sqlalchemy import func, literal, select, update
from sqlalchemy.dialects.postgresql import aggregate_order_by
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from core.access.db.shared_metadata import shared_metadata
from core.access.providerStorage import MediaStorage, provider_storage
from core.utils.safeAsyncCall import safe_async
from result import Result, ResultCode


def album_metadata(with_images: bool) -> Select[Any]:
    table = shared_metadata.tables["spotify_scrapper.album"]
    source = table
    image = table.c.image_id
    return select(
        table.c.id.label("id"),
        table.c.name.label("name"),
        (image if with_images else literal(None)).label("image_id"),
        table.c.spotify_id.label("external_id"),
        literal(False).label("manageable"),
    ).select_from(source)


def playlist_metadata(with_images: bool) -> Select[Any]:
    table = shared_metadata.tables["spotify_scrapper.playlist"]
    source = table
    image = table.c.image_id
    return select(
        table.c.id.label("id"),
        table.c.name.label("name"),
        (image if with_images else literal(None)).label("image_id"),
        table.c.spotify_id.label("external_id"),
        literal(False).label("manageable"),
    ).select_from(source)


def track_metadata(with_images: bool) -> Select[Any]:
    table = shared_metadata.tables["spotify_scrapper.track"]
    album = shared_metadata.tables["spotify_scrapper.album"]
    source = table.outerjoin(album, album.c.id == table.c.album_id) if with_images else table
    image = album.c.image_id
    return select(
        table.c.id.label("id"),
        table.c.name.label("name"),
        (image if with_images else literal(None)).label("image_id"),
        table.c.spotify_id.label("external_id"),
        literal(True).label("manageable"),
    ).select_from(source)


def track_files() -> Select[Any]:
    table = shared_metadata.tables["spotify_scrapper.track"]
    return select(table.c.id.label("id"), table.c.path.label("path"), table.c.name.label("name"))


@safe_async
async def clear_track_files(session: AsyncSession, media_ids: list[int]) -> Result[list[str]]:
    """Detach this provider's downloaded files in one batch."""
    table = shared_metadata.tables["spotify_scrapper.track"]
    old = await session.execute(select(table.c.path).where(table.c.id.in_(media_ids)))
    paths = [path for path in old.scalars() if path]
    await session.execute(update(table).where(table.c.id.in_(media_ids)).values(path=None))
    return Result(code=ResultCode.OK, message="OK", result=paths)


def track_audio_tags(media_ids: list[int]) -> Select[Any]:
    """Project export tags in one batch, independently of remote API activation."""
    table = shared_metadata.tables["spotify_scrapper.track"]
    album = shared_metadata.tables["spotify_scrapper.album"]
    artist = shared_metadata.tables["spotify_scrapper.artist"]
    track_link = shared_metadata.tables["spotify_scrapper.track_artist"]
    album_link = shared_metadata.tables["spotify_scrapper.album_artist"]
    artists = (
        select(func.array_agg(aggregate_order_by(artist.c.name, artist.c.id)))
        .select_from(track_link.join(artist, artist.c.id == track_link.c.artist_id))
        .where(track_link.c.track_id == table.c.id)
        .correlate(table)
        .scalar_subquery()
    )
    album_artists = (
        select(func.array_agg(aggregate_order_by(artist.c.name, artist.c.id)))
        .select_from(album_link.join(artist, artist.c.id == album_link.c.artist_id))
        .where(album_link.c.album_id == album.c.id)
        .correlate(album)
        .scalar_subquery()
    )
    return (
        select(
            table.c.id.label("id"),
            artists.label("artists"),
            album.c.name.label("album"),
            album_artists.label("album_artists"),
            album.c.release_date.label("date"),
            table.c.track_number.label("track"),
            table.c.disc_number.label("disc"),
            literal(None).label("isrc"),
            album.c.image_id.label("image_id"),
        )
        .select_from(table.outerjoin(album, album.c.id == table.c.album_id))
        .where(table.c.id.in_(media_ids))
    )


provider_storage.register(
    MediaStorage(key="spotify_scrapper.album", metadata_statement=album_metadata),
    MediaStorage(key="spotify_scrapper.playlist", metadata_statement=playlist_metadata),
    MediaStorage(
        key="spotify_scrapper.track",
        metadata_statement=track_metadata,
        audio_tags_statement=track_audio_tags,
        files_statement=track_files,
        clear_files_async=clear_track_files,
    ),
)
