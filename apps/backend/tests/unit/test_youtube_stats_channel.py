"""Stats must credit the video's uploader without relying on legacy channel links."""

from collections.abc import Iterator
from datetime import UTC, datetime
from typing import Any, cast
from unittest.mock import AsyncMock

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Connection, CursorResult
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Executable

from core.access.statsAccess import StatsAccess
from core.access.statsV2Access import StatsV2Access
from core.framework import providers
from core.framework.media.image import Image
from youtube.framework.provider.yotubeProvider import YoutubeProvider

pytestmark = pytest.mark.unit


@pytest.fixture(params=[[], [(1, 30), (2, 30)], [(1, 10), (1, 30), (2, 20)]])
def catalog(
    request: pytest.FixtureRequest, monkeypatch: pytest.MonkeyPatch
) -> Iterator[tuple[AsyncMock, Connection]]:
    monkeypatch.setattr(providers, "_providers", [YoutubeProvider()])
    monkeypatch.setattr(
        Image, "get_internal_image_urls_by_ids_async", AsyncMock(return_value={100: "/cover"})
    )
    engine = create_engine("sqlite://")
    with engine.connect() as connection:
        for schema in ("core", "youtube"):
            connection.exec_driver_sql(f"ATTACH DATABASE ':memory:' AS {schema}")
        statements = [
            "CREATE TABLE core.media (id INTEGER PRIMARY KEY, public_id TEXT)",
            "CREATE TABLE core.image (id INTEGER PRIMARY KEY)",
            "CREATE TABLE youtube.channel (id INTEGER PRIMARY KEY, name TEXT, image_id INTEGER)",
            "CREATE TABLE youtube.video (id INTEGER PRIMARY KEY, name TEXT, channel_id INTEGER, "
            "image_id INTEGER, duration_ms INTEGER, real_duration_ms INTEGER)",
            "CREATE TABLE youtube.video_channel (video_id INTEGER, channel_id INTEGER)",
            "CREATE TABLE core.user_media_listened "
            "(user_id INTEGER, media_id INTEGER, date_added TEXT)",
            "CREATE TABLE core.user_media_listen_interval (user_id INTEGER, media_id INTEGER, "
            "date_added TEXT, time_ms_start INTEGER, time_ms_end INTEGER)",
            "INSERT INTO core.media VALUES (1, 'video-one'), (2, 'video-two'), "
            "(10, 'channel-one'), (20, 'channel-two'), (30, 'legacy-channel')",
            "INSERT INTO core.image VALUES (100), (200), (300)",
            "INSERT INTO youtube.channel VALUES (10, 'Actual Channel', 200), "
            "(20, 'Second Channel', 300), (30, 'Incorrect Legacy Credit', 300)",
            "INSERT INTO youtube.video VALUES (1, 'First concert', 10, 100, 30000, NULL), "
            "(2, 'Second concert', 20, 100, 30000, NULL)",
            "INSERT INTO core.user_media_listened VALUES "
            "(42, 1, '2026-11-10 12:00:00'), (42, 1, '2026-11-10 13:00:00'), "
            "(42, 2, '2026-11-10 14:00:00')",
            "INSERT INTO core.user_media_listen_interval VALUES "
            "(42, 1, '2026-11-10 12:00:00', 0, 2000), "
            "(42, 1, '2026-11-10 13:00:00', 5000, 8000), "
            "(42, 2, '2026-11-10 14:00:00', 0, 1000)",
        ]
        for statement in statements:
            connection.exec_driver_sql(statement)
        links = cast(list[tuple[int, int]], request.param)
        if links:
            connection.exec_driver_sql("INSERT INTO youtube.video_channel VALUES (?, ?)", links)

        async def execute(statement: Executable, params: dict[str, Any]) -> CursorResult[Any]:
            bindings = {
                key: value.isoformat(sep=" ") if isinstance(value, datetime) else value
                for key, value in params.items()
            }
            return connection.execute(statement, bindings)

        session = AsyncMock(spec=AsyncSession)
        session.execute.side_effect = execute
        yield session, connection
    engine.dispose()


@pytest.mark.parametrize("access", [StatsAccess, StatsV2Access])
async def test_video_rankings_use_the_primary_channel_without_duplicate_credits(
    catalog: tuple[AsyncMock, Connection], access: type[StatsAccess] | type[StatsV2Access]
) -> None:
    session, connection = catalog
    result = await access.get_top_videos_async(
        session=session,
        user_id=42,
        start_date=datetime(2026, 11, 1, tzinfo=UTC),
        end_date=datetime(2026, 12, 1, tzinfo=UTC),
        limit=10,
    )
    assert result.is_ok(), result.info()
    videos = result.result()
    assert [(video.publicId, video.subtitle) for video in videos] == [
        ("video-one", "Actual Channel"),
        ("video-two", "Second Channel"),
    ]
    assert [video.value for video in videos] == ([2, 1] if access is StatsAccess else [5000, 1000])
    session.execute.assert_awaited_once()

    fragment = YoutubeProvider().get_stats_artist_info_cte_fragment()
    assert fragment is not None
    rows = connection.execute(text(f"SELECT * FROM ({fragment}) ORDER BY media_id")).fetchall()
    assert [tuple(row) for row in rows] == [
        (1, "channel-one", "Actual Channel", 200),
        (2, "channel-two", "Second Channel", 300),
    ]
