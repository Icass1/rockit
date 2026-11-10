"""Storage registration must preserve references across key conflicts and retries."""

import asyncio
import os
from collections.abc import AsyncIterator
from uuid import uuid4

import pytest
from sqlalchemy import func, inspect, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine

from core.access.db.migrations import MIGRATIONS
from core.access.db.ormModels.image import ImageRow
from core.access.db.ormModels.storageObject import StorageObjectRow
from core.access.storageObjectAccess import StorageObjectAccess

pytestmark = pytest.mark.integration


@pytest.fixture
async def storage_database() -> AsyncIterator[AsyncEngine]:
    """Create only storage tables in a disposable database on a dedicated test server."""
    url = os.environ.get("ROCKIT_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set ROCKIT_TEST_DATABASE_URL to a dedicated PostgreSQL test server")
    name = f"rockit_test_{uuid4().hex}"
    admin = create_async_engine(url, isolation_level="AUTOCOMMIT")
    async with admin.connect() as conn:
        await conn.execute(text(f'CREATE DATABASE "{name}"'))
    engine = create_async_engine(make_url(url).set(database=name))
    try:
        async with engine.begin() as conn:
            await conn.execute(text("CREATE SCHEMA core"))
            await conn.run_sync(StorageObjectRow.metadata.tables["core.storage_object"].create)
            await conn.run_sync(ImageRow.metadata.tables["core.image"].create)
        yield engine
    finally:
        await engine.dispose()
        async with admin.connect() as conn:
            await conn.execute(text(f'DROP DATABASE "{name}" WITH (FORCE)'))
        await admin.dispose()


@pytest.mark.parametrize("existing_constraint", [False, True])
async def test_migration_adds_unique_original_key_once(
    storage_database: AsyncEngine, existing_constraint: bool
) -> None:
    migration = next(m for m in MIGRATIONS if m.name == "unique_storage_object_original_key")
    async with storage_database.begin() as conn:
        if existing_constraint:
            await conn.execute(
                text(
                    "ALTER TABLE core.storage_object RENAME CONSTRAINT "
                    "storage_object_original_key_key TO deployed_original_key_unique"
                )
            )
        else:
            await conn.execute(
                text(
                    "ALTER TABLE core.storage_object "
                    "DROP CONSTRAINT storage_object_original_key_key"
                )
            )
        for _ in range(2):
            for statement in migration.statements:
                await conn.execute(text(statement))
        constraints = await conn.run_sync(
            lambda sync_conn: inspect(sync_conn).get_unique_constraints(
                "storage_object", schema="core"
            )
        )
        assert sum(c["column_names"] == ["original_key"] for c in constraints) == 1

    async with AsyncSession(storage_database) as session:
        session.add_all(
            [
                StorageObjectRow(bucket="test", key="one", public_id="one", original_key="source"),
                StorageObjectRow(bucket="test", key="two", public_id="two"),
                StorageObjectRow(bucket="test", key="three", public_id="three"),
            ]
        )
        await session.commit()
        session.add(
            StorageObjectRow(bucket="test", key="four", public_id="four", original_key="source")
        )
        with pytest.raises(IntegrityError):
            await session.flush()
        await session.rollback()


async def test_original_key_conflict_updates_location_without_replacing_references(
    storage_database: AsyncEngine,
) -> None:
    async with AsyncSession(storage_database, expire_on_commit=False) as session:
        stored = StorageObjectRow(
            bucket="old-bucket",
            key="old-placeholder.webp",
            public_id="existing",
            original_key="playlist-placeholder.png",
            content_type="image/png",
            size_bytes=10,
            etag="old",
        )
        session.add(stored)
        await session.flush()
        image = ImageRow(storage_object_id=stored.id, public_id="image")
        session.add(image)
        await session.commit()
        stored_id, date_added = stored.id, stored.date_added

        result = await StorageObjectAccess.insert_object_async(
            session=session,
            bucket="new-bucket",
            key="playlist-placeholder.webp",
            original_key="playlist-placeholder.png",
            content_type="image/webp",
            size_bytes=1840,
            etag="new",
        )
        assert result.is_ok(), result.info()
        updated = result.result()
        assert updated is stored
        assert (updated.id, updated.public_id, updated.date_added) == (
            stored_id,
            "existing",
            date_added,
        )
        assert (updated.bucket, updated.key) == ("new-bucket", "playlist-placeholder.webp")
        assert (updated.content_type, updated.size_bytes, updated.etag) == (
            "image/webp",
            1840,
            "new",
        )
        await session.commit()
        await session.refresh(image, attribute_names=["storage_object"])
        assert image.storage_object_id == stored_id
        assert image.storage_object.key == "playlist-placeholder.webp"
        assert await session.scalar(select(func.count()).select_from(StorageObjectRow)) == 1


async def test_key_conflict_backfills_original_key_and_preserves_metadata_without_etag(
    storage_database: AsyncEngine,
) -> None:
    async with AsyncSession(storage_database, expire_on_commit=False) as session:
        first = await StorageObjectAccess.insert_object_async(
            session=session,
            bucket="test",
            key="image.webp",
            content_type="image/webp",
            size_bytes=42,
            etag="etag",
        )
        assert first.is_ok(), first.info()
        stored = first.result()
        backfilled = await StorageObjectAccess.insert_object_async(
            session=session,
            bucket="test",
            key=stored.key,
            original_key="image.png",
        )
        assert backfilled.is_ok(), backfilled.info()
        assert backfilled.result() is stored
        repeated = await StorageObjectAccess.insert_object_async(
            session=session, bucket="test", key=stored.key
        )
        assert repeated.is_ok(), repeated.info()
        assert repeated.result() is stored
        assert (stored.original_key, stored.content_type, stored.size_bytes, stored.etag) == (
            "image.png",
            "image/webp",
            42,
            "etag",
        )
        await session.commit()
        assert await session.scalar(select(func.count()).select_from(StorageObjectRow)) == 1


@pytest.mark.parametrize("original_key", [None, "playlist-placeholder.png"])
async def test_concurrent_registrations_reuse_one_row(
    storage_database: AsyncEngine,
    original_key: str | None,
) -> None:
    async def register(index: int) -> tuple[int, str]:
        async with AsyncSession(storage_database, expire_on_commit=False) as session:
            result = await StorageObjectAccess.insert_object_async(
                session=session,
                bucket="test",
                key=f"image-{index}.webp" if original_key else "image.webp",
                original_key=original_key,
                content_type="image/webp",
                size_bytes=42,
                etag="etag",
            )
            assert result.is_ok(), result.info()
            stored = result.result()
            await session.commit()
            return stored.id, stored.public_id

    identities = await asyncio.gather(*(register(i) for i in range(6)))
    assert len(set(identities)) == 1
    async with AsyncSession(storage_database) as session:
        assert await session.scalar(select(func.count()).select_from(StorageObjectRow)) == 1


async def test_conflicting_existing_identities_fail_without_poisoning_session(
    storage_database: AsyncEngine,
) -> None:
    async with AsyncSession(storage_database) as session:
        session.add_all(
            [
                StorageObjectRow(
                    bucket="test", key="one.webp", original_key="one.png", public_id="one"
                ),
                StorageObjectRow(
                    bucket="test", key="two.webp", original_key="two.png", public_id="two"
                ),
            ]
        )
        await session.commit()
        result = await StorageObjectAccess.insert_object_async(
            session=session,
            bucket="test",
            key="one.webp",
            original_key="two.png",
            etag="new",
        )
        assert result.is_not_ok()
        pairs = (
            await session.execute(select(StorageObjectRow.key, StorageObjectRow.original_key))
        ).all()
        assert set(pairs) == {("one.webp", "one.png"), ("two.webp", "two.png")}
