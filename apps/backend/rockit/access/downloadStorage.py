"""Provider-owned queries for local download metadata and files."""

from typing import Any

from sqlalchemy import func, literal, select
from sqlalchemy.dialects.postgresql import aggregate_order_by
from sqlalchemy.sql import Select

from core.access.db.shared_metadata import shared_metadata
from core.access.providerStorage import MediaStorage, provider_storage
from core.access.storedFiles import file_key_column


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
        file_key_column(table).label("path"),
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
        file_key_column(table).label("path"),
        table.c.name.label("name"),
    )


def song_audio_tags(media_ids: list[int]) -> Select[Any]:
    """Project export tags in one batch, independently of remote API activation."""
    table = shared_metadata.tables["rockit.song"]
    album = shared_metadata.tables["rockit.album"]
    artist = shared_metadata.tables["rockit.artist"]
    track_link = shared_metadata.tables["rockit.song_artists"]
    album_link = shared_metadata.tables["rockit.album_artists"]
    artists = (
        select(func.array_agg(aggregate_order_by(artist.c.name, artist.c.id)))
        .select_from(track_link.join(artist, artist.c.id == track_link.c.artist_id))
        .where(track_link.c.song_id == table.c.id)
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
            func.coalesce(album.c.image_id, table.c.image_id).label("image_id"),
        )
        .select_from(table.outerjoin(album, album.c.id == table.c.album_id))
        .where(table.c.id.in_(media_ids))
    )


provider_storage.register(
    MediaStorage(key="rockit.album", metadata_statement=album_metadata),
    MediaStorage(
        key="rockit.song",
        metadata_statement=song_metadata,
        audio_tags_statement=song_audio_tags,
        files_statement=song_files,
    ),
    MediaStorage(
        key="rockit.video",
        metadata_statement=video_metadata,
        files_statement=video_files,
    ),
)
