"""Backend startup follows the template order while retaining Rockit workers."""

import asyncio
from unittest.mock import AsyncMock, Mock

import pytest

import core
from app import main
from core.framework.downloader import downloads_manager as _downloads_manager
from core.framework.storage import Storage
from core.framework.websocket.webSocketManager import ws_manager

downloads_manager = _downloads_manager


@pytest.mark.asyncio
async def test_startup_initializes_shared_services_and_closes_workers(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[str] = []

    async def database_init() -> None:
        calls.append("database")

    async def storage_init() -> None:
        calls.append("storage")

    async def seed() -> None:
        calls.append("seed")

    async def wait() -> None:
        calls.append("session")

    async def worker() -> None:
        calls.append("worker")
        try:
            await asyncio.Event().wait()
        finally:
            calls.append("cancelled")

    socket = Mock(close=AsyncMock())
    monkeypatch.setattr(main.db_context, "async_init", database_init)
    monkeypatch.setattr(Storage, "ensure_bucket_async", storage_init)
    monkeypatch.setattr(core, "add_initial_content_async", seed)
    monkeypatch.setattr(main.db_context, "wait_for_session_local_async", wait)
    monkeypatch.setattr(main.providers, "get_providers", list[object])
    monkeypatch.setattr(downloads_manager, "download_manager", worker)
    monkeypatch.setattr(ws_manager, "active_connections", {1: [socket]})
    async with main.lifespan(main.app):
        await asyncio.sleep(0)
        assert calls == ["database", "storage", "seed", "session", "worker"]
    assert calls[-1] == "cancelled"
    socket.close.assert_awaited_once_with(code=1001, reason="Server shutting down")


@pytest.mark.asyncio
async def test_database_failure_aborts_startup(monkeypatch: pytest.MonkeyPatch) -> None:
    init = AsyncMock(side_effect=RuntimeError("database unavailable"))
    storage = AsyncMock()
    monkeypatch.setattr(main.db_context, "async_init", init)
    monkeypatch.setattr(Storage, "ensure_bucket_async", storage)
    with pytest.raises(RuntimeError, match="database unavailable"):
        async with main.lifespan(main.app):
            pytest.fail("Application served requests after startup failed")
    storage.assert_not_awaited()
