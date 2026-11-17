"""Exercise real full-text ranking and migration/trigger behavior in PostgreSQL."""

import os
from collections.abc import AsyncIterator
from uuid import uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine

from core.access.db import migrations
from lrclib.access.db.migrations import MIGRATIONS as LYRICS_MIGRATIONS
from lrclib.access.lyricsAccess import LyricsAccess

pytestmark = pytest.mark.integration


@pytest.fixture
async def lyrics_database() -> AsyncIterator[AsyncEngine]:
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
                "CREATE SCHEMA lrclib",
                "CREATE TABLE core.media (id integer PRIMARY KEY, public_id text, "
                "media_type_key integer)",
                "CREATE TABLE lrclib.lyrics (id integer PRIMARY KEY, media_id integer UNIQUE "
                "REFERENCES core.media(id))",
                "CREATE TABLE lrclib.lyrics_line (id serial PRIMARY KEY, lyrics_id integer "
                "REFERENCES lrclib.lyrics(id), line_number integer, text text)",
                "CREATE TABLE lrclib.dynamic_lyrics_line (id serial PRIMARY KEY, "
                "lyrics_id integer REFERENCES lrclib.lyrics(id), line_number integer, text text)",
                "INSERT INTO core.media SELECT i, i::text, CASE WHEN i = 6 THEN 5 ELSE 4 END "
                "FROM generate_series(1, 6) i",
                "INSERT INTO lrclib.lyrics SELECT i, i FROM generate_series(1, 6) i",
                # Existing plain lyrics must be indexed by the upgrade without being re-saved.
                "INSERT INTO lrclib.lyrics_line (lyrics_id, line_number, text) VALUES "
                "(1, 0, 'Hello from'), (1, 1, 'the other side'), "
                "(2, 0, 'hello distant skies the other bright stars side'), "
                "(3, 0, 'Bonjour le monde'), (5, 0, '  ')",
                "INSERT INTO lrclib.dynamic_lyrics_line (lyrics_id, line_number, text) VALUES "
                "(4, 0, 'hello from the other side'), (6, 0, 'hello from the other side')",
            ):
                await conn.execute(text(statement))
        with pytest.MonkeyPatch.context() as patch:
            patch.setattr(migrations, "MIGRATIONS", LYRICS_MIGRATIONS)
            # The second startup must leave the index/triggers and existing documents intact.
            await migrations.apply_migrations_async(engine=engine)
            await migrations.apply_migrations_async(engine=engine)
        yield engine
    finally:
        await engine.dispose()
        async with admin.connect() as conn:
            await conn.execute(text(f'DROP DATABASE "{name}" WITH (FORCE)'))
        await admin.dispose()


async def test_backfill_phrase_ranking_cross_line_and_timed_only_lyrics(
    lyrics_database: AsyncEngine,
) -> None:
    async with AsyncSession(lyrics_database) as session:
        result = await LyricsAccess.search_async(
            session=session, query="HELLO, the other side!", limit=15
        )
        assert result.is_ok(), result.info()
        matches = result.result()
        assert set(matches) == {1, 2, 4, 6}
        assert matches[1] == matches[4] == matches[6] > matches[2]
        phrase = await LyricsAccess.search_async(session=session, query="from the other", limit=15)
        assert phrase.is_ok() and set(phrase.result()) == {1, 4, 6}
        french = await LyricsAccess.search_async(session=session, query="bonjour monde", limit=15)
        assert french.is_ok() and set(french.result()) == {3}
        punctuation = await LyricsAccess.search_async(session=session, query="!!! | &", limit=15)
        assert punctuation.is_ok() and not punctuation.result()
        video = await LyricsAccess.search_async(
            session=session, query="hello", limit=15, media_type="video"
        )
        assert video.is_ok() and set(video.result()) == {6}
        limited = await LyricsAccess.search_async(session=session, query="hello", limit=1)
        assert limited.is_ok() and len(limited.result()) == 1
        literal = await LyricsAccess.search_async(
            session=session, query="hello OR nonexistent", limit=15
        )
        assert literal.is_ok() and not literal.result()


async def test_bulk_insert_edit_move_delete_and_plain_timed_precedence(
    lyrics_database: AsyncEngine,
) -> None:
    async with AsyncSession(lyrics_database) as session:
        await session.execute(
            text(
                "INSERT INTO lrclib.dynamic_lyrics_line (lyrics_id, line_number, text) "
                "VALUES (5, 0, 'a new sunrise'), (5, 1, 'over the mountain')"
            )
        )
        result = await LyricsAccess.search_async(session=session, query="sunrise over", limit=15)
        assert result.is_ok() and set(result.result()) == {5}
        await session.execute(
            text(
                "UPDATE lrclib.dynamic_lyrics_line SET text = 'a golden sunset' "
                "WHERE lyrics_id = 5 AND line_number = 0"
            )
        )
        old = await LyricsAccess.search_async(session=session, query="sunrise", limit=15)
        assert old.is_ok() and not old.result()
        updated = await LyricsAccess.search_async(session=session, query="golden sunset", limit=15)
        assert updated.is_ok() and set(updated.result()) == {5}
        await session.execute(
            text(
                "INSERT INTO lrclib.lyrics_line (lyrics_id, line_number, text) "
                "VALUES (5, 1, 'a silver moon')"
            )
        )
        plain = await LyricsAccess.search_async(session=session, query="silver moon", limit=15)
        assert plain.is_ok() and set(plain.result()) == {5}
        hidden = await LyricsAccess.search_async(session=session, query="golden sunset", limit=15)
        assert hidden.is_ok() and not hidden.result()
        await session.execute(
            text(
                "UPDATE lrclib.lyrics_line SET lyrics_id = 3 "
                "WHERE lyrics_id = 5 AND line_number = 1"
            )
        )
        moved = await LyricsAccess.search_async(session=session, query="silver moon", limit=15)
        assert moved.is_ok() and set(moved.result()) == {3}
        restored = await LyricsAccess.search_async(session=session, query="golden sunset", limit=15)
        assert restored.is_ok() and set(restored.result()) == {5}
        await session.execute(text("DELETE FROM lrclib.dynamic_lyrics_line WHERE lyrics_id = 5"))
        deleted = await LyricsAccess.search_async(session=session, query="golden sunset", limit=15)
        assert deleted.is_ok() and not deleted.result()


async def test_search_predicate_can_use_the_gin_index(lyrics_database: AsyncEngine) -> None:
    async with lyrics_database.connect() as conn:
        await conn.execute(text("SET LOCAL enable_seqscan = off"))
        plan = await conn.execute(
            text(
                "EXPLAIN SELECT media_id FROM lrclib.lyrics "
                "WHERE search_document @@ plainto_tsquery('simple', 'hello other')"
            )
        )
        assert "ix_lyrics_search_document" in "\n".join(row[0] for row in plan)
