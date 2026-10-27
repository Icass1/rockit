"""Real PostgreSQL checks for upgrade safety and enforced storage references."""

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, IntegrityError
from sqlalchemy.ext.asyncio import AsyncEngine

from core.access.db.migrations import STORED_MEDIA_TABLES, apply_migrations_async


async def seed(engine: AsyncEngine, *, missing_key: bool = False, fresh: bool = False) -> None:
    async with engine.begin() as connection:
        for schema in {"core", *(entry[0] for entry in STORED_MEDIA_TABLES)}:
            await connection.execute(text(f'CREATE SCHEMA "{schema}"'))
        await connection.execute(
            text(
                "CREATE TABLE core.storage_object "
                "(id INTEGER PRIMARY KEY, key VARCHAR UNIQUE NOT NULL)"
            )
        )
        await connection.execute(
            text("INSERT INTO core.storage_object VALUES (1, 'song.mp3'), (2, 'builds/v1.apk')")
        )
        for schema, table, column, nullable in STORED_MEDIA_TABLES:
            field = (
                "storage_object_id INTEGER REFERENCES core.storage_object(id)"
                + ("" if nullable else " NOT NULL")
                if fresh
                else f'"{column}" VARCHAR'
            )
            await connection.execute(
                text(f'CREATE TABLE "{schema}"."{table}" (id INTEGER PRIMARY KEY, {field})')
            )
            if not fresh:
                key = "unregistered.mp3" if missing_key and schema == "rockit" else "song.mp3"
                await connection.execute(
                    text(f'INSERT INTO "{schema}"."{table}" VALUES (1, :key)'), {"key": key}
                )
                if nullable:
                    await connection.execute(
                        text(f'INSERT INTO "{schema}"."{table}" VALUES (2, NULL)')
                    )
        version_reference = (
            ", storage_object_id INTEGER NOT NULL REFERENCES core.storage_object(id)"
            if fresh
            else ""
        )
        await connection.execute(
            text(
                "CREATE TABLE core.app_version "
                f"(id INTEGER PRIMARY KEY, apk_filename VARCHAR NOT NULL{version_reference})"
            )
        )
        if not fresh:
            await connection.execute(text("INSERT INTO core.app_version VALUES (1, 'v1.apk')"))
        upload_fields = (
            "storage_object_id INTEGER NOT NULL REFERENCES core.storage_object(id), "
            "multipart_upload_id VARCHAR NOT NULL"
            if fresh
            else "file_path VARCHAR"
        )
        await connection.execute(
            text(
                f"CREATE TABLE core.build_upload_session (id INTEGER PRIMARY KEY, {upload_fields})"
            )
        )
        if not fresh:
            await connection.execute(
                text("INSERT INTO core.build_upload_session VALUES (1, '/tmp/old-upload')")
            )


async def test_upgrade_backfills_foreign_keys_drops_paths_and_is_repeatable(
    migration_engine: AsyncEngine,
) -> None:
    await seed(migration_engine)
    await apply_migrations_async(migration_engine)
    await apply_migrations_async(migration_engine)
    async with migration_engine.connect() as connection:
        for schema, table, column, nullable in STORED_MEDIA_TABLES:
            result = await connection.execute(
                text(f'SELECT storage_object_id FROM "{schema}"."{table}" ORDER BY id')
            )
            assert list(result.scalars()) == ([1, None] if nullable else [1])
            result = await connection.execute(
                text(
                    "SELECT count(*) FROM information_schema.columns "
                    "WHERE table_schema=:schema AND table_name=:table AND column_name=:column"
                ),
                {"schema": schema, "table": table, "column": column},
            )
            assert result.scalar_one() == 0
        assert (
            await connection.execute(text("SELECT storage_object_id FROM core.app_version"))
        ).scalar_one() == 2
        assert (
            await connection.execute(text("SELECT count(*) FROM core.build_upload_session"))
        ).scalar_one() == 0
        assert (
            await connection.execute(text("SELECT count(*) FROM core.database_migrations"))
        ).scalar_one() == 1
    with pytest.raises(IntegrityError):
        async with migration_engine.begin() as connection:
            await connection.execute(text("UPDATE spotify.track SET storage_object_id=999"))


async def test_unregistered_key_aborts_without_dropping_existing_data(
    migration_engine: AsyncEngine,
) -> None:
    await seed(migration_engine, missing_key=True)
    with pytest.raises(DBAPIError, match="Unregistered storage key"):
        await apply_migrations_async(migration_engine)
    async with migration_engine.connect() as connection:
        assert (
            await connection.execute(text("SELECT path FROM spotify.track WHERE id=1"))
        ).scalar_one() == "song.mp3"
        assert (
            await connection.execute(text("SELECT file_path FROM rockit.song WHERE id=1"))
        ).scalar_one() == "unregistered.mp3"


async def test_fresh_schema_does_not_gain_duplicate_foreign_keys(
    migration_engine: AsyncEngine,
) -> None:
    await seed(migration_engine, fresh=True)
    await apply_migrations_async(migration_engine)
    async with migration_engine.connect() as connection:
        result = await connection.execute(
            text(
                "SELECT count(*) FROM pg_constraint "
                "WHERE conrelid='spotify.track'::regclass AND contype='f'"
            )
        )
        assert result.scalar_one() == 1
