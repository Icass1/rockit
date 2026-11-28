"""Upgrade existing queues and persist sections against disposable PostgreSQL databases."""

import os
from collections.abc import AsyncIterator
from uuid import uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine

from core.access.bookmarkAccess import BookmarkAccess
from core.access.collectionAccess import CollectionAccess
from core.access.db import migrations
from core.access.userQueueAccess import UserQueueAccess
from core.framework.models.queue import QueueItem

pytestmark = pytest.mark.integration


@pytest.fixture
async def queue_database() -> AsyncIterator[AsyncEngine]:
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
            for statement in (
                "CREATE SCHEMA core",
                'CREATE TABLE core."user" (id INTEGER PRIMARY KEY, queue_type_key INTEGER, '
                "current_queue_id INTEGER, current_time_ms INTEGER)",
                "CREATE TABLE core.user_queue (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, "
                "media_id INTEGER NOT NULL, list_media_id INTEGER, queue_id INTEGER NOT NULL, "
                "sorted_index INTEGER NOT NULL, random_index INTEGER NOT NULL, "
                "date_added TIMESTAMPTZ DEFAULT NOW(), UNIQUE (user_id, queue_id), "
                "UNIQUE (user_id, sorted_index), UNIQUE (user_id, random_index))",
                'INSERT INTO core."user" VALUES (42, 2, 0, 0)',
                "CREATE TABLE core.bookmark (user_id INTEGER, media_id INTEGER, "
                "timestamp DOUBLE PRECISION)",
                "INSERT INTO core.bookmark VALUES (42, 7, 0), (42, 7, 10), "
                "(99, 7, 20), (42, 8, 30)",
                "INSERT INTO core.user_queue "
                "(user_id, media_id, queue_id, sorted_index, random_index) "
                "VALUES (42, 7, 0, 0, 0)",
            ):
                await conn.execute(text(statement))
        yield engine
    finally:
        await engine.dispose()
        async with admin.connect() as conn:
            await conn.execute(text(f'DROP DATABASE "{name}" WITH (FORCE)'))
        await admin.dispose()


async def test_migration_and_both_queue_writers_preserve_nullable_bounds(
    queue_database: AsyncEngine, monkeypatch: pytest.MonkeyPatch
) -> None:
    migration = next(item for item in migrations.MIGRATIONS if item.name == "add_queue_time_bounds")
    monkeypatch.setattr(migrations, "MIGRATIONS", (migration,))
    await migrations.apply_migrations_async(engine=queue_database)
    await migrations.apply_migrations_async(engine=queue_database)
    async with AsyncSession(queue_database) as session:
        legacy = await session.execute(
            text("SELECT start_time_ms, end_time_ms FROM core.user_queue")
        )
        assert tuple(legacy.one()) == (None, None)
        bounds = [(None, None), (1000, None), (None, 5000), (1000, 5000)]
        items = [
            QueueItem(
                media_id=7,
                queue_id=i,
                list_id=None,
                sorted_index=i,
                random_index=3 - i,
                start_time_ms=start,
                end_time_ms=end,
            )
            for i, (start, end) in enumerate(bounds)
        ]
        saved = await CollectionAccess.save_queue_async(
            session=session, user_id=42, queue_items=items, start_by_queue_type={1: 3, 2: 1}
        )
        assert saved.is_ok(), saved.info()
        selected = await session.execute(
            text('SELECT current_queue_id, current_time_ms FROM core."user" WHERE id = 42')
        )
        assert tuple(selected.one()) == (1, 1000)
        loaded = await session.execute(
            text("SELECT start_time_ms, end_time_ms FROM core.user_queue ORDER BY sorted_index")
        )
        assert [tuple(row) for row in loaded] == bounds
        saved_again = await UserQueueAccess.save_user_queue_async(
            session=session, user_id=42, queue_items=items
        )
        assert saved_again.is_ok(), saved_again.info()
        loaded_again = await session.execute(
            text("SELECT start_time_ms, end_time_ms FROM core.user_queue ORDER BY sorted_index")
        )
        assert [tuple(row) for row in loaded_again] == bounds


async def test_bookmark_marker_lookup_is_scoped_to_viewer_and_requested_media(
    queue_database: AsyncEngine,
) -> None:
    async with AsyncSession(queue_database) as session:
        result = await BookmarkAccess.get_bookmark_timestamps_by_user_and_medias_async(
            session=session, user_id=42, media_ids=[7]
        )
        assert result.is_ok(), result.info()
        assert sorted(result.result()) == [(7, 0), (7, 10)]
