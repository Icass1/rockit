"""Album rankings must enrich albums once, regardless of the interval count."""

import os
from collections.abc import AsyncIterator, Iterator
from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine

from core.access.db import migrations
from core.access.statsV2Access import StatsV2Access
from core.framework import providers
from core.framework.media.image import Image
from spotify.framework.provider.spotifyProvider import SpotifyProvider
from youtubeMusic.framework.provider.youtubeMusicProvider import YoutubeMusicProvider

pytestmark = pytest.mark.integration


@pytest.fixture
async def stats_database(monkeypatch: pytest.MonkeyPatch) -> AsyncIterator[AsyncEngine]:
    url = os.environ.get("ROCKIT_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set ROCKIT_TEST_DATABASE_URL to a dedicated PostgreSQL test server")
    name = f"rockit_test_{uuid4().hex}"
    admin = create_async_engine(url, isolation_level="AUTOCOMMIT")
    async with admin.connect() as conn:
        await conn.execute(text(f'CREATE DATABASE "{name}"'))
    engine = create_async_engine(make_url(url).set(database=name))
    monkeypatch.setattr(providers, "_providers", [SpotifyProvider(), YoutubeMusicProvider()])
    monkeypatch.setattr(
        Image, "get_internal_image_urls_by_ids_async", AsyncMock(return_value={100: "/cover"})
    )
    try:
        async with engine.begin() as conn:
            statements = (
                "SET LOCAL TIME ZONE 'UTC'",
                "CREATE SCHEMA core",
                "CREATE SCHEMA spotify",
                "CREATE SCHEMA youtube_music",
                "CREATE TABLE core.media (id int PRIMARY KEY, public_id text)",
                "CREATE TABLE core.image (id int PRIMARY KEY)",
                "CREATE TABLE core.user_media_listen_interval (id serial PRIMARY KEY, "
                "user_id int, media_id int, date_added timestamptz, "
                "time_ms_start int, time_ms_end int)",
                "CREATE TABLE spotify.track (id int PRIMARY KEY, album_id int)",
                "CREATE TABLE spotify.album (id int PRIMARY KEY, name text, image_id int)",
                "CREATE TABLE spotify.artist (id int PRIMARY KEY, name text)",
                "CREATE TABLE spotify.album_artist (album_id int, artist_id int)",
                "CREATE TABLE youtube_music.track (id int PRIMARY KEY, album_id int)",
                "CREATE TABLE youtube_music.album (id int PRIMARY KEY, title text, image_id int)",
                "CREATE TABLE youtube_music.artist (id int PRIMARY KEY, name text)",
                "CREATE TABLE youtube_music.album_artists (album_id int, artist_id int)",
                "INSERT INTO core.media VALUES (10, 'spotify-album'), (20, 'other-artist'), "
                "(30, 'yt-album'), (40, 'uncredited')",
                "INSERT INTO core.image VALUES (100)",
                "INSERT INTO spotify.album VALUES (10, 'Shared Title', 100), "
                "(20, 'Shared Title', 100), (40, 'Instrumental', 100)",
                "INSERT INTO spotify.artist VALUES (1, 'Artist A'), (2, 'Artist B'), (3, 'Guest')",
                # Repeated credits must still be deduplicated and sorted by the provider.
                "INSERT INTO spotify.album_artist VALUES (10, 3), (10, 1), (10, 1), (20, 2)",
                "INSERT INTO spotify.track VALUES (1, 10), (2, 10), (3, 20), (4, 40)",
                "INSERT INTO youtube_music.album VALUES (30, 'Shared Title', 100)",
                "INSERT INTO youtube_music.artist VALUES (1, 'Artist A'), (3, 'Guest')",
                "INSERT INTO youtube_music.album_artists VALUES (30, 1), (30, 3)",
                "INSERT INTO youtube_music.track VALUES (5, 30)",
                # Each range includes distinct totals, repeated intervals, and another user.
                "INSERT INTO core.user_media_listen_interval "
                "(user_id, media_id, date_added, time_ms_start, time_ms_end) "
                "SELECT 42, media_id, '2026-11-24 00:00:00+00'::timestamptz "
                "- days * interval '1 day', "
                "1000, 1000 + duration FROM (VALUES (1, 2000), (1, 3000), (2, 1000), "
                "(3, 4000), (4, 1000), (5, 5000)) AS listens(media_id, duration) "
                "CROSS JOIN (VALUES (1), (7), (30)) AS dates(days)",
                "INSERT INTO core.user_media_listen_interval "
                "(user_id, media_id, date_added, time_ms_start, time_ms_end) VALUES "
                "(99, 3, '2026-11-23 00:00:00+00', 0, 1000000), "
                "(42, 3, '2026-11-24 00:00:00+00', 0, 1000000), "
                "(42, 3, '2026-10-24 00:00:00+00', 0, 1000000)",
            )
            for statement in statements:
                await conn.execute(text(statement))
        migration = next(
            item
            for item in migrations.MIGRATIONS
            if item.name == "index_stats_v2_listening_intervals"
        )
        with monkeypatch.context() as patch:
            patch.setattr(migrations, "MIGRATIONS", (migration,))
            await migrations.apply_migrations_async(engine=engine)
            await migrations.apply_migrations_async(engine=engine)
        yield engine
    finally:
        await engine.dispose()
        async with admin.connect() as conn:
            await conn.execute(text(f'DROP DATABASE "{name}" WITH (FORCE)'))
        await admin.dispose()


@pytest.mark.parametrize("days, multiplier", [(1, 1), (7, 2), (30, 3)])
async def test_album_rankings_preserve_totals_credits_and_cross_provider_merging(
    stats_database: AsyncEngine, days: int, multiplier: int
) -> None:
    async with AsyncSession(stats_database) as session:
        end = datetime(2026, 11, 24, tzinfo=UTC)
        start = end - timedelta(days=days)
        result = await StatsV2Access.get_top_albums_async(
            session=session, user_id=42, start_date=start, end_date=end, limit=25
        )
        assert result.is_ok(), result.info()
        albums = result.result()
        assert [(row.publicId, row.subtitle, row.value) for row in albums] == [
            ("spotify-album", "Artist A, Guest", 11000 * multiplier),
            ("other-artist", "Artist B", 4000 * multiplier),
            ("uncredited", None, 1000 * multiplier),
        ]
        assert all(row.imageUrl == "/cover" for row in albums)
        assert albums[0].href == "/album/spotify-album"
        limited = await StatsV2Access.get_top_albums_async(
            session=session, user_id=42, start_date=start, end_date=end, limit=1
        )
        assert limited.is_ok(), limited.info()
        assert limited.result() == albums[:1]


async def test_empty_range_skips_metadata_enrichment(stats_database: AsyncEngine) -> None:
    async with AsyncSession(stats_database) as session:
        execute = AsyncMock(wraps=session.execute)
        session.execute = execute
        result = await StatsV2Access.get_top_albums_async(
            session=session,
            user_id=123,
            start_date=datetime(2026, 11, 17, tzinfo=UTC),
            end_date=datetime(2026, 11, 24, tzinfo=UTC),
        )
        assert result.is_ok() and result.result() == []
        execute.assert_awaited_once()


def _plan_nodes(node: dict[str, Any]) -> Iterator[dict[str, Any]]:
    yield node
    for child in node.get("Plans", []):
        yield from _plan_nodes(child)


async def test_metadata_work_is_bounded_by_albums_and_range_uses_index(
    stats_database: AsyncEngine,
) -> None:
    async with AsyncSession(stats_database) as session:
        await session.execute(
            text(
                "INSERT INTO core.user_media_listen_interval "
                "(user_id, media_id, date_added, time_ms_start, time_ms_end) "
                "SELECT 42, 1, '2026-11-23 00:00:00+00', 0, 30000 FROM generate_series(1, 6000)"
            )
        )
        await session.execute(text("ANALYZE core.user_media_listen_interval"))
        execute = AsyncMock(wraps=session.execute)
        session.execute = execute
        result = await StatsV2Access.get_top_albums_async(
            session=session,
            user_id=42,
            start_date=datetime(2026, 11, 17, tzinfo=UTC),
            end_date=datetime(2026, 11, 24, tzinfo=UTC),
            limit=25,
        )
        assert result.is_ok(), result.info()
        assert result.result()[0].value == 180022000
        assert execute.await_count == 2
        for call in execute.await_args_list:
            plan_result = await AsyncSession.execute(
                session, text("EXPLAIN (ANALYZE, FORMAT JSON) " + str(call.args[0])), call.args[1]
            )
            plan = plan_result.scalar_one()[0]
            nodes = list(_plan_nodes(plan["Plan"]))
            subplans = [n for n in nodes if n.get("Subplan Name", "").startswith("SubPlan")]
            assert all(n["Actual Loops"] <= 4 for n in subplans)
            assert not plan.get("JIT", {}).get("Options", {}).get("Optimization", False)
        await AsyncSession.execute(session, text("SET LOCAL enable_seqscan = off"))
        plan_result = await AsyncSession.execute(
            session,
            text(
                "EXPLAIN SELECT media_id, SUM(time_ms_end - time_ms_start) "
                "FROM core.user_media_listen_interval "
                "WHERE user_id = 42 AND date_added >= '2026-11-17' "
                "AND date_added < '2026-11-24 00:00:00+00' GROUP BY media_id"
            ),
        )
        assert "ix_user_media_listen_interval_user_date" in "\n".join(row[0] for row in plan_result)
