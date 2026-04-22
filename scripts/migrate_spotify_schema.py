# type: ignore

import asyncio
from dataclasses import dataclass
import sys
import math

from typing import Any

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    async_sessionmaker,
    create_async_engine,
    AsyncSession,
)
from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert


sys.path.append(".")

from backend.core.enums.mediaTypeEnum import MediaTypeEnum
from backend.utils.backendUtils import create_id

from backend.core.access.db.db import *
from backend.spotify.access.db.db import *
from backend.spotify.framework.spotify import Spotify
from backend.spotify.access.db.associationTables.artist_genres import artist_genres
from backend.spotify.access.db.associationTables.album_artists import album_artists
from backend.spotify.access.db.associationTables.song_artists import song_artists
from backend.spotify.access.db.associationTables.artist_external_images import (
    artist_external_images,
)
from backend.spotify.access.db.associationTables.album_external_images import (
    album_external_images,
)
from backend.spotify.access.db.associationTables.album_copyrights import (
    album_copyrights,
)

a_result_id = Spotify.provider.get_id()
spotify_id = a_result_id.result()


album_id_map: dict[int, int] = {}
track_id_map: dict[int, int] = {}
artist_id_map: dict[int, int] = {}


@dataclass
class ConnectionInfo:
    username: str
    password: str
    host: str
    port: int
    database: str


src_connection_info = ConnectionInfo(
    username="admin",
    password="admin",
    host="rockit",
    port=5432,
    database="development_11",
)

dst_connection_info = ConnectionInfo(
    username="admin",
    password="admin",
    host="rockit",
    port=5432,
    database="development_2",
)


def create_engine(
    connection_info: ConnectionInfo, verbose: bool = False
) -> AsyncEngine:
    connection_string = f"postgresql+asyncpg://{connection_info.username}:{connection_info.password}@{connection_info.host}:{connection_info.port}/{connection_info.database}"
    print(f"Using connection string '{connection_string}'")
    return create_async_engine(
        url=connection_string,
        echo=verbose,
    )


async def migrate_table_simple(
    src_engine: AsyncEngine,
    dst_engine: AsyncEngine,
    table_class: Any,
    maps: list[dict[int, int]] | None = None,
    column_names: list[str] | None = None,
):

    print(f"Migrating {table_class}")

    async with src_engine.connect() as src_conn, dst_engine.connect() as dst_conn:

        result = await src_conn.execute(select(table_class))
        rows = result.fetchall()

        payload = [dict(row._mapping) for row in rows]

        if not payload:
            return

        if maps and column_names:
            for row in payload:
                for map_dict, column_name in zip(maps, column_names):
                    if column_name in row and row[column_name] in map_dict:
                        row[column_name] = map_dict[row[column_name]]

        num_columns = len(payload[0])
        max_params = 32767
        batch_size = max(1, math.floor(max_params / num_columns))

        for i in range(0, len(payload), batch_size):
            batch = payload[i : i + batch_size]

            insert_stmt = insert(table_class).values(batch).on_conflict_do_nothing()

            await dst_conn.execute(insert_stmt)

        await dst_conn.commit()


async def migrate_table_reference_media(
    src_engine: AsyncEngine,
    dst_engine: AsyncEngine,
    table_class: Any,
    media_type_key: MediaTypeEnum,
):
    """Migrates tables but creating a CoreMediaRow reference for each row. This is for tables that have a media_id foreign key."""

    print(f"Migrating {table_class.__tablename__} with media type {media_type_key}")

    async with src_engine.connect() as src_conn:
        async with AsyncSession(dst_engine) as dst_session:

            result = await src_conn.execute(select(table_class))
            rows = result.fetchall()

            existing_albums_result = await dst_session.execute(
                select(AlbumRow).where(
                    AlbumRow.spotify_id.in_(
                        [
                            row._mapping["spotify_id"]
                            for row in rows
                            if "spotify_id" in row._mapping
                        ]
                    )
                )
            )

            existing_albums = existing_albums_result.scalars().all()

            existing_tracks_result = await dst_session.execute(
                select(TrackRow).where(
                    TrackRow.spotify_id.in_(
                        [
                            row._mapping["spotify_id"]
                            for row in rows
                            if "spotify_id" in row._mapping
                        ]
                    )
                )
            )

            existing_tracks = existing_tracks_result.scalars().all()

            existing_artists_result = await dst_session.execute(
                select(ArtistRow).where(
                    ArtistRow.spotify_id.in_(
                        [
                            row._mapping["spotify_id"]
                            for row in rows
                            if "spotify_id" in row._mapping
                        ]
                    )
                )
            )

            existing_artists = existing_artists_result.scalars().all()

            for row in rows:
                row_dict = dict(row._mapping)

                media_row = CoreMediaRow(
                    public_id=create_id(32),
                    provider_id=spotify_id,
                    media_type_key=media_type_key.value,
                )

                dst_session.add(media_row)
                await dst_session.flush()

                if media_type_key == MediaTypeEnum.ALBUM:
                    existing_album: AlbumRow

                    for a in existing_albums:
                        if a.spotify_id == row_dict["spotify_id"]:
                            existing_album = a
                            album_id_map[row_dict["id"]] = existing_album.id
                            break
                    else:
                        album_id_map[row_dict["id"]] = media_row.id

                if media_type_key == MediaTypeEnum.SONG:
                    for a in existing_tracks:
                        if a.spotify_id == row_dict["spotify_id"]:
                            existing_song = a
                            track_id_map[row_dict["id"]] = existing_song.id
                            break
                    else:
                        track_id_map[row_dict["id"]] = media_row.id

                    row_dict["album_id"] = album_id_map.get(row_dict["album_id"])

                if media_type_key == MediaTypeEnum.ARTIST:

                    for a in existing_artists:
                        if a.spotify_id == row_dict["spotify_id"]:
                            existing_artist = a
                            artist_id_map[row_dict["id"]] = existing_artist.id
                            break
                    else:

                        artist_id_map[row_dict["id"]] = media_row.id

                row_dict["id"] = media_row.id

                row_dict.pop("date_updated", None)
                row_dict.pop("date_added", None)

                stmt = insert(table_class).values(row_dict).on_conflict_do_nothing()

                await dst_session.execute(stmt)

            await dst_session.commit()


async def get_referencing_fks(conn: AsyncSession, table_schema: str, table_name: str):
    query = text(
        """
        SELECT
            tc.table_name AS ref_table,
            kcu.column_name AS ref_column,
            kcu.table_schema AS ref_table_schema
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_name = :table_name
          AND ccu.table_schema = :table_schema
    """
    )

    result = await conn.execute(
        query,
        {
            "table_name": table_name,
            "table_schema": table_schema,
        },
    )

    return result.fetchall()


async def delete_orphans(
    conn: AsyncSession, target_schema: str, target_table: str, target_pk: str = "id"
):
    fks = await get_referencing_fks(conn, target_schema, target_table)

    if not fks:
        # nothing references it → delete everything
        await conn.execute(text(f"DELETE FROM {target_schema}.{target_table}"))
        return

    conditions: list[str] = []

    for ref_table, ref_column, ref_table_schema in fks:
        conditions.append(
            f"NOT EXISTS ("
            f"SELECT 1 FROM {ref_table_schema}.{ref_table} "
            f"WHERE {ref_column} = m.{target_pk})"
        )

    where_clause = " AND ".join(conditions)

    sql = text(
        f"""
        DELETE FROM {target_schema}.{target_table} m
        WHERE {where_clause}
    """
    )

    await conn.execute(sql)
    await conn.commit()


async def main():
    verbose = False

    src_engine: AsyncEngine = create_engine(src_connection_info, verbose)
    dst_engine: AsyncEngine = create_engine(dst_connection_info, verbose)

    dst_session_maker = async_sessionmaker(bind=dst_engine, expire_on_commit=False)

    await migrate_table_simple(src_engine, dst_engine, GenreRow)
    await migrate_table_simple(src_engine, dst_engine, CopyrightRow)
    await migrate_table_simple(src_engine, dst_engine, ExternalImageRow)
    await migrate_table_simple(src_engine, dst_engine, ImageRow)
    await migrate_table_reference_media(
        src_engine, dst_engine, AlbumRow, media_type_key=MediaTypeEnum.ALBUM
    )

    await migrate_table_reference_media(
        src_engine, dst_engine, ArtistRow, media_type_key=MediaTypeEnum.ARTIST
    )

    await migrate_table_reference_media(
        src_engine, dst_engine, TrackRow, media_type_key=MediaTypeEnum.SONG
    )

    await migrate_table_simple(
        src_engine,
        dst_engine,
        album_artists,
        [album_id_map, artist_id_map],
        ["album_id", "artist_id"],
    )

    await migrate_table_simple(
        src_engine,
        dst_engine,
        song_artists,
        [track_id_map, artist_id_map],
        ["track_id", "artist_id"],
    )

    await migrate_table_simple(
        src_engine,
        dst_engine,
        album_copyrights,
        [album_id_map],
        ["album_id"],
    )

    await migrate_table_simple(
        src_engine,
        dst_engine,
        album_copyrights,
        [album_id_map],
        ["album_id"],
    )

    await migrate_table_simple(
        src_engine,
        dst_engine,
        album_external_images,
        [album_id_map],
        ["album_id"],
    )

    await migrate_table_simple(
        src_engine,
        dst_engine,
        artist_genres,
        [artist_id_map],
        ["artist_id"],
    )

    await migrate_table_simple(
        src_engine,
        dst_engine,
        artist_external_images,
        [artist_id_map],
        ["artist_id"],
    )

    session = dst_session_maker()

    try:
        await delete_orphans(session, target_schema="core", target_table="media")
    finally:
        await session.close()


if __name__ == "__main__":
    asyncio.run(main())
