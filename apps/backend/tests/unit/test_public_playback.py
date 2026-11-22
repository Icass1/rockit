"""Exercise public reads and authenticated mutations through real FastAPI dependencies."""

from collections.abc import AsyncIterator, Awaitable, Callable
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi import FastAPI, Request, Response
from sqlalchemy import Boolean, Column, Integer, MetaData, Table, insert, select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.main import app as backend_app
from core.enums.queueTypeEnum import QueueTypeEnum
from core.framework.auth.session import Session
from core.framework.media.collection import Collection
from core.framework.media.media import Media
from core.responses.baseVideoResponse import BaseVideoResponse
from core.responses.mediaResponse import MediaResponse
from core.responses.queueResponse import QueueResponse
from default.access import collectionSource
from default.access.collectionSource import DefaultCollectionSource
from result import Result, ResultCode

pytestmark = pytest.mark.unit


@pytest.fixture
async def public_client() -> AsyncIterator[httpx.AsyncClient]:
    app = FastAPI()

    @app.middleware("http")
    async def database(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        request.state.db = AsyncMock(spec=AsyncSession)
        return await call_next(request)

    app.include_router(backend_app.router)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://public-test"
    ) as client:
        yield client


async def test_public_media_read_uses_anonymous_viewer(
    public_client: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    video = BaseVideoResponse(
        provider="test",
        publicId="video",
        providerUrl="",
        name="Video",
        imageUrl="",
        dominantColor="",
        duration_ms=1000,
        artists=[],
        downloaded=True,
    )
    lookup = AsyncMock(
        return_value=Result(code=ResultCode.OK, message="OK", result=MediaResponse(media=video))
    )
    monkeypatch.setattr(Media, "get_media_async", lookup)
    response = await public_client.get("/media/video")
    assert response.status_code == 200
    assert response.json()["media"]["publicId"] == "video"
    assert lookup.await_args is not None
    assert lookup.await_args.kwargs["user_id"] == 0


async def test_guest_collection_resolution_never_persists(
    public_client: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    lookup = AsyncMock(
        return_value=Result(
            code=ResultCode.OK,
            message="OK",
            result=QueueResponse(
                queue=[], currentQueueMediaId=None, queueType=QueueTypeEnum.SORTED
            ),
        )
    )
    monkeypatch.setattr(Collection, "queue_async", lookup)
    response = await public_client.get("/media/collection/public-list/playable")
    assert response.status_code == 200
    assert lookup.await_args is not None
    assert lookup.await_args.kwargs["user_id"] == 0
    assert lookup.await_args.kwargs["persist"] is False


@pytest.mark.parametrize(
    ("method", "path", "body"),
    [
        ("POST", "/media/collection/list/queue", {"startPublicId": None}),
        ("GET", "/user/queue", None),
        ("DELETE", "/media/video", None),
        ("POST", "/media/url/add", {"url": "https://example.com/song", "addToLibrary": True}),
    ],
)
async def test_guest_cannot_mutate_or_read_an_account_queue(
    public_client: httpx.AsyncClient, method: str, path: str, body: dict[str, object] | None
) -> None:
    response = await public_client.request(method=method, url=path, json=body)
    assert response.status_code == 401


async def test_anonymous_queue_cannot_be_saved_even_through_framework() -> None:
    result = await Collection.queue_async(
        session=AsyncMock(spec=AsyncSession), public_id="list", user_id=0
    )
    assert result.code() == ResultCode.VALIDATION_ERROR


@pytest.mark.parametrize("session_state", ["missing", "expired", "disabled"])
async def test_stale_cookie_can_browse_but_cannot_save_a_queue(
    public_client: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch, session_state: str
) -> None:
    record = SimpleNamespace(
        user_id=42,
        disabled=session_state == "disabled",
        expires_at=datetime.now(UTC) + timedelta(days=-1 if session_state == "expired" else 1),
    )
    monkeypatch.setattr(
        Session,
        "get_user_id_from_session_async",
        AsyncMock(
            return_value=Result(
                code=ResultCode.NOT_FOUND if session_state == "missing" else ResultCode.OK,
                message="session",
                result=record,
            )
        ),
    )
    resolve = AsyncMock(
        return_value=Result(
            code=ResultCode.OK,
            message="OK",
            result=QueueResponse(
                queue=[], currentQueueMediaId=None, queueType=QueueTypeEnum.SORTED
            ),
        )
    )
    monkeypatch.setattr(Collection, "queue_async", resolve)
    public_client.cookies.set("session_id", "stale")
    assert (await public_client.get("/media/collection/list/playable")).status_code == 200
    assert resolve.await_args is not None
    assert resolve.await_args.kwargs["user_id"] == 0
    assert (await public_client.post("/media/collection/list/queue", json={})).status_code == 401
    assert resolve.await_count == 1


async def test_private_playlist_visibility_for_guests_owners_and_contributors(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Run the provider's actual permission predicate against persisted rows."""
    metadata = MetaData()
    media = Table("media", metadata, Column("id", Integer, primary_key=True))
    playlists = Table(
        "playlist",
        metadata,
        Column("id", Integer, primary_key=True),
        Column("is_public", Boolean),
        Column("owner_id", Integer),
    )
    contributors = Table(
        "contributor", metadata, Column("playlist_id", Integer), Column("user_id", Integer)
    )
    monkeypatch.setattr(
        collectionSource,
        "shared_metadata",
        SimpleNamespace(
            tables={
                "core.media": media,
                "default_schema.playlist": playlists,
                "default_schema.playlist_contributor": contributors,
            }
        ),
    )
    engine = create_async_engine("sqlite+aiosqlite://")
    try:
        async with engine.begin() as connection:
            await connection.run_sync(metadata.create_all)
            await connection.execute(insert(media), [{"id": 1}, {"id": 2}, {"id": 3}])
            await connection.execute(
                insert(playlists),
                [
                    {"id": 1, "is_public": True, "owner_id": 42},
                    {"id": 2, "is_public": False, "owner_id": 42},
                    {"id": 3, "is_public": False, "owner_id": 99},
                ],
            )
            await connection.execute(insert(contributors), [{"playlist_id": 3, "user_id": 42}])
            for viewer, expected in [(0, [1]), (42, [1, 2, 3]), (99, [1, 3])]:
                rows = await connection.execute(
                    select(media.c.id)
                    .where(DefaultCollectionSource.visible(user_id=viewer))
                    .order_by(media.c.id)
                )
                assert list(rows.scalars()) == expected
    finally:
        await engine.dispose()


async def test_valid_session_preserves_collection_visibility(
    public_client: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    from core.access.userAccess import UserAccess

    monkeypatch.setattr(
        Session,
        "get_user_id_from_session_async",
        AsyncMock(
            return_value=Result(
                code=ResultCode.OK,
                message="OK",
                result=SimpleNamespace(
                    user_id=42, disabled=False, expires_at=datetime.now(UTC) + timedelta(days=1)
                ),
            )
        ),
    )
    monkeypatch.setattr(
        UserAccess,
        "get_user_from_id",
        AsyncMock(
            return_value=Result(code=ResultCode.OK, message="OK", result=SimpleNamespace(id=42))
        ),
    )
    lookup = AsyncMock(
        return_value=Result(
            code=ResultCode.OK,
            message="OK",
            result=QueueResponse(
                queue=[], currentQueueMediaId=None, queueType=QueueTypeEnum.SORTED
            ),
        )
    )
    monkeypatch.setattr(Collection, "queue_async", lookup)
    public_client.cookies.set("session_id", "valid")
    response = await public_client.get("/media/collection/list/playable")
    assert response.status_code == 200
    assert lookup.await_args is not None
    assert lookup.await_args.kwargs["user_id"] == 42


async def test_optional_auth_does_not_hide_database_errors(
    public_client: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        Session,
        "get_user_id_from_session_async",
        AsyncMock(return_value=Result(code=ResultCode.GENERAL_ERROR, message="Unavailable")),
    )
    lookup = AsyncMock()
    monkeypatch.setattr(Collection, "queue_async", lookup)
    public_client.cookies.set("session_id", "valid")
    response = await public_client.get("/media/collection/list/playable")
    assert response.status_code == 500
    lookup.assert_not_awaited()


async def test_public_home_only_reads_catalog_recommendations(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from core.access.recommendationAccess import RecommendationAccess
    from core.access.statsAccess import StatsAccess
    from core.framework.stats import Stats

    monkeypatch.setattr(
        RecommendationAccess,
        "get_community_top_song_ids_async",
        AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=[])),
    )
    personal = AsyncMock(side_effect=AssertionError("Guest must not read personal history"))
    monkeypatch.setattr(StatsAccess, "get_recently_played_songs_async", personal)
    monkeypatch.setattr(Media, "resolve_songs_from_public_ids_async", AsyncMock(return_value=[]))
    response = await Stats.get_home_stats_async(session=AsyncMock(spec=AsyncSession), user_id=0)
    assert response.is_ok()
    assert response.result().recentlyClickedMedia == []
    assert response.result().currentStreak == 0
    personal.assert_not_awaited()
