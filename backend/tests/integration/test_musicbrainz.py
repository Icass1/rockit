"""Real PostgreSQL cache and shared gate; upstream HTTP is always mocked."""

import asyncio
from contextlib import asynccontextmanager
from time import monotonic
from types import SimpleNamespace
from collections.abc import AsyncIterator, Callable, Coroutine

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.musicBrainz.framework import musicBrainzApi as api
from backend.musicBrainz.framework.musicBrainzApi import MusicBrainzApi

pytestmark = pytest.mark.integration


def configure(
    database: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
    handler: (
        Callable[[httpx.Request], httpx.Response]
        | Callable[[httpx.Request], Coroutine[None, None, httpx.Response]]
    ),
) -> None:
    engine = database.bind

    @asynccontextmanager
    async def scope() -> AsyncIterator[AsyncSession]:
        async with AsyncSession(bind=engine, expire_on_commit=False) as session:
            async with session.begin():
                yield session

    monkeypatch.setattr(api, "rockit_db", SimpleNamespace(session_scope_async=scope))
    client = httpx.AsyncClient
    transport = httpx.MockTransport(handler)

    def mock_client(*, timeout: float, follow_redirects: bool) -> httpx.AsyncClient:
        return client(
            transport=transport, timeout=timeout, follow_redirects=follow_redirects
        )

    monkeypatch.setattr(api.httpx, "AsyncClient", mock_client)


async def test_concurrent_workers_share_rate_gate_and_persist_cache(
    database: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    starts: list[float] = []

    async def upstream(request: httpx.Request) -> httpx.Response:
        starts.append(monotonic())
        await asyncio.sleep(0.03)
        return httpx.Response(
            200,
            json={"id": request.url.path, "relations": [{"type": "member of band"}]},
        )

    configure(database, monkeypatch, upstream)
    # Independent sessions/tasks, including concurrent misses for the same key.
    results = await asyncio.gather(
        MusicBrainzApi.fetch_async(path="artist/one", params={}, entity="artist"),
        MusicBrainzApi.fetch_async(path="artist/two", params={}, entity="artist"),
        MusicBrainzApi.fetch_async(path="artist/one", params={}, entity="artist"),
    )
    assert all(result.is_ok() for result in results)
    assert len(starts) == 2
    assert starts[1] - starts[0] >= 1.1
    cached = await MusicBrainzApi.fetch_async(
        path="artist/one", params={}, entity="artist"
    )
    assert cached.is_ok()
    assert cached.result().cached
    assert cached.result().data["relations"] == [{"type": "member of band"}]
    assert len(starts) == 2


@pytest.mark.parametrize("status", [429, 503])
async def test_failed_refresh_keeps_cache_and_cooldown_blocks_other_misses(
    database: AsyncSession, monkeypatch: pytest.MonkeyPatch, status: int
) -> None:
    calls: list[str] = []

    def upstream(request: httpx.Request) -> httpx.Response:
        calls.append(request.url.path)
        if len(calls) == 1:
            return httpx.Response(200, json={"name": "Saved artist"})
        return httpx.Response(status, headers={"Retry-After": "120"})

    configure(database, monkeypatch, upstream)
    first = await MusicBrainzApi.fetch_async(
        path="artist/saved", params={}, entity="artist"
    )
    assert first.is_ok()
    refreshed = await MusicBrainzApi.fetch_async(
        path="artist/saved", params={}, entity="artist", refresh=True
    )
    assert refreshed.is_ok()
    assert refreshed.result().stale
    assert refreshed.result().data == {"name": "Saved artist"}
    missing = await MusicBrainzApi.fetch_async(
        path="artist/new", params={}, entity="artist"
    )
    assert missing.is_not_ok()
    cached = await MusicBrainzApi.fetch_async(
        path="artist/saved", params={}, entity="artist"
    )
    assert cached.is_ok()
    assert cached.result().cached
    assert cached.result().fetchedAt == first.result().fetchedAt
    assert len(calls) == 2


async def test_disconnect_preserves_gate_and_finishes_cache_write(
    database: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    started = asyncio.Event()
    release = asyncio.Event()
    starts: list[float] = []

    async def upstream(request: httpx.Request) -> httpx.Response:
        starts.append(monotonic())
        if len(starts) == 1:
            started.set()
            await release.wait()
        return httpx.Response(200, json={"id": request.url.path})

    configure(database, monkeypatch, upstream)
    caller = asyncio.create_task(
        MusicBrainzApi.fetch_async(path="artist/cancelled", params={}, entity="artist")
    )
    await asyncio.wait_for(started.wait(), timeout=5)
    caller.cancel()
    with pytest.raises(asyncio.CancelledError):
        await caller
    second = asyncio.create_task(
        MusicBrainzApi.fetch_async(path="artist/next", params={}, entity="artist")
    )
    release.set()
    result = await asyncio.wait_for(second, timeout=5)
    assert result.is_ok()
    assert starts[1] - starts[0] >= 1.1
    cached = await MusicBrainzApi.fetch_async(
        path="artist/cancelled", params={}, entity="artist"
    )
    assert cached.is_ok()
    assert cached.result().cached
    assert len(starts) == 2
