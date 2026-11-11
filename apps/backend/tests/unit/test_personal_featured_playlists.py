"""Dynamic playlist selections are bounded and scoped to the authenticated user."""

from collections.abc import Iterator
from datetime import UTC, datetime, timedelta, tzinfo
from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import HTTPException, Request
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Connection, CursorResult
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from core.access.downloadAccess import DownloadAccess
from core.access.statsAccess import StatsAccess
from core.middlewares.authMiddleware import AuthMiddleware
from core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from default.access.db.ormModels.playlist import PlaylistRow
from default.access.playlistAccess import PlaylistAccess
from featured.framework import featured
from result import Result, ResultCode

pytestmark = pytest.mark.unit


def ok[T](value: T) -> Result[T]:
    return Result(code=ResultCode.OK, message="OK", result=value)


@pytest.fixture
def database() -> Iterator[Connection]:
    """Execute production selection predicates against isolated SQLite tables."""
    engine = create_engine("sqlite://")
    with engine.connect() as connection:
        for schema in ("core", "default_schema"):
            connection.exec_driver_sql(f"ATTACH DATABASE ':memory:' AS {schema}")
        for ddl in (
            "CREATE TABLE core.media (id INTEGER PRIMARY KEY, public_id TEXT, "
            "media_type_key INTEGER)",
            "CREATE TABLE core.download_group (id INTEGER PRIMARY KEY, user_id INTEGER)",
            "CREATE TABLE core.download (id INTEGER PRIMARY KEY, media_id INTEGER, "
            "download_group_id INTEGER, status_key INTEGER, date_ended TIMESTAMP)",
            "CREATE TABLE core.user_library_media (id INTEGER PRIMARY KEY, user_id INTEGER, "
            "media_id INTEGER, date_added TIMESTAMP)",
            "CREATE TABLE default_schema.playlist (id INTEGER PRIMARY KEY, owner_id INTEGER)",
        ):
            connection.exec_driver_sql(ddl)
        yield connection
    engine.dispose()


async def test_latest_downloads_scope_completion_deduplication_and_limit(
    database: Connection,
) -> None:
    database.exec_driver_sql("INSERT INTO core.download_group VALUES (1, 7), (2, 8)")
    now = datetime(2026, 6, 1)
    for index in range(1, 56):
        database.execute(
            text("INSERT INTO core.media VALUES (:id, :public_id, :kind)"),
            {"id": index, "public_id": f"media-{index}", "kind": 5 if index == 55 else 4},
        )
        database.execute(
            text("INSERT INTO core.download VALUES (:id, :id, 1, 3, :ended)"),
            {"id": index, "ended": now + timedelta(minutes=index)},
        )
    # Repeat downloads occupy one slot; other users' downloads cannot reorder it.
    for id, media_id, group_id, days in [(100, 1, 1, 1), (101, 2, 2, 2)]:
        database.execute(
            text("INSERT INTO core.download VALUES (:id, :media, :group_id, 3, :ended)"),
            {
                "id": id,
                "media": media_id,
                "group_id": group_id,
                "ended": now + timedelta(days=days),
            },
        )
    for index, kind, status, ended in (
        (201, 4, 1, now + timedelta(days=3)),
        (202, 4, 4, now + timedelta(days=3)),
        (203, 3, 3, now + timedelta(days=3)),
        (204, 4, 3, None),
    ):
        database.execute(
            text("INSERT INTO core.media VALUES (:id, :public_id, :kind)"),
            {"id": index, "public_id": f"media-{index}", "kind": kind},
        )
        database.execute(
            text("INSERT INTO core.download VALUES (:id, :id, 1, :status, :ended)"),
            {"id": index, "status": status, "ended": ended},
        )
    session = AsyncMock(spec=AsyncSession)

    def execute(statement: Select[Any]) -> CursorResult[Any]:
        return database.execute(statement)

    session.execute.side_effect = execute
    result = await DownloadAccess.get_latest_downloaded_media_public_ids_async(
        session=session, user_id=7
    )
    assert result.is_ok(), result.info()
    assert result.result() == ["media-1"] + [f"media-{i}" for i in range(55, 6, -1)]
    assert session.execute.await_count == 1
    other = await DownloadAccess.get_latest_downloaded_media_public_ids_async(
        session=session, user_id=8
    )
    assert other.is_ok() and other.result() == ["media-2"]
    empty = await DownloadAccess.get_latest_downloaded_media_public_ids_async(
        session=session, user_id=9
    )
    assert empty.is_ok() and empty.result() == []


@pytest.mark.parametrize("owned_only, expected", [(False, [2, 1]), (True, [1])])
async def test_playlist_options_follow_library_membership(
    database: Connection, owned_only: bool, expected: list[int]
) -> None:
    # Playlist 3 is owned but removed from the library; 2 belongs to someone else.
    database.exec_driver_sql(
        "INSERT INTO default_schema.playlist VALUES (1, 7), (2, 8), (3, 7), (4, 8)"
    )
    database.exec_driver_sql(
        "INSERT INTO core.user_library_media VALUES "
        "(1, 7, 1, '2026-01-01'), (2, 7, 2, '2026-01-02'), (3, 8, 4, '2026-01-03')"
    )
    session = AsyncMock(spec=AsyncSession)

    def execute(statement: Select[Any]) -> Mock:
        # Narrow projection avoids loading unrelated metadata in this SQL fixture.
        ids = database.execute(statement.with_only_columns(PlaylistRow.id)).scalars().all()
        response = Mock()
        response.scalars.return_value.all.return_value = [SimpleNamespace(id=id) for id in ids]
        return response

    session.execute.side_effect = execute
    result = await PlaylistAccess.get_user_playlists_async(
        session=session, user_id=7, owned_only=owned_only
    )
    assert result.is_ok(), result.info()
    assert [row.id for row in result.result()] == expected
    assert session.execute.await_count == 1


async def test_latest_downloads_resolves_only_scoped_ordered_ids(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = AsyncMock(spec=AsyncSession)
    ids = AsyncMock(return_value=ok(["newest", "older"]))
    resolve = AsyncMock(return_value=ok([]))
    monkeypatch.setattr(DownloadAccess, "get_latest_downloaded_media_public_ids_async", ids)
    monkeypatch.setattr(featured, "_resolve_medias", resolve)
    result = await featured.get_latest_downloads_playlist_async(session=session, user_id=7)
    assert result.is_ok()
    assert result.result().publicId == "latest-downloads"
    assert result.result().limit == 50
    ids.assert_awaited_once_with(session=session, user_id=7, limit=50)
    resolve.assert_awaited_once_with(session=session, public_ids=["newest", "older"])


async def test_latest_downloads_propagates_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        DownloadAccess,
        "get_latest_downloaded_media_public_ids_async",
        AsyncMock(return_value=Result(code=ResultCode.GENERAL_ERROR, message="Unavailable")),
    )
    resolve = AsyncMock()
    monkeypatch.setattr(featured, "_resolve_medias", resolve)
    result = await featured.get_latest_downloads_playlist_async(
        session=AsyncMock(spec=AsyncSession), user_id=7
    )
    assert result.is_not_ok()
    resolve.assert_not_awaited()


async def test_year_recap_limits_previous_calendar_year_in_backend(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class FrozenDatetime(datetime):
        @classmethod
        def now(cls, tz: tzinfo | None = None) -> datetime:
            return datetime(2026, 1, 1, tzinfo=UTC)

    monkeypatch.setattr(featured, "datetime", FrozenDatetime)
    ids = AsyncMock(return_value=ok([]))
    monkeypatch.setattr(StatsAccess, "get_top_media_public_ids_async", ids)
    session = AsyncMock(spec=AsyncSession)
    result = await featured.get_year_recap_playlist_async(session=session, user_id=7)
    assert result.is_ok()
    ids.assert_awaited_once_with(
        session=session,
        user_id=7,
        start_date=datetime(2025, 1, 1, tzinfo=UTC),
        end_date=datetime(2026, 1, 1, tzinfo=UTC),
        limit=50,
    )


async def test_latest_downloads_endpoint_uses_authenticated_viewer(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from core.framework.websocket import ws_manager
    from featured.controllers import featuredController

    assert ws_manager is not None
    session = AsyncMock(spec=AsyncSession)
    request = cast(Request, Mock())
    monkeypatch.setattr(DBSessionMiddleware, "get_session", Mock(return_value=session))
    monkeypatch.setattr(
        AuthMiddleware, "get_current_user", Mock(return_value=ok(SimpleNamespace(id=7)))
    )
    load = AsyncMock(return_value=ok(Mock()))
    monkeypatch.setattr(featured, "get_latest_downloads_playlist_async", load)
    await featuredController.get_featured_latest_downloads(request=request)
    load.assert_awaited_once_with(session=session, user_id=7)
    load.reset_mock()
    monkeypatch.setattr(
        AuthMiddleware,
        "get_current_user",
        Mock(return_value=Result(code=ResultCode.VALIDATION_ERROR, message="Login required")),
    )
    with pytest.raises(HTTPException) as error:
        await featuredController.get_featured_latest_downloads(request=request)
    assert error.value.status_code == 401
    load.assert_not_awaited()
