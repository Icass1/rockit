"""Keep core independent of installed providers and exercise extension contracts."""

import ast
from pathlib import Path
from unittest.mock import AsyncMock, Mock

import pytest
from sqlalchemy import select
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.access.providerStorage import ProviderStorage, provider_storage
from backend.core.access.downloadBrowseAccess import DownloadBrowseAccess
from backend.core.framework import providers
from backend.core.framework.media.media import Media
from backend.core.framework.models.media import MediaModel
from backend.core.framework.provider.baseMediaProvider import BaseMediaProvider
from backend.core.framework.downloader.downloadsManager import DownloadsManager

pytestmark = pytest.mark.unit


def test_core_has_no_concrete_provider_imports_or_schema_names() -> None:
    backend = Path(__file__).resolve().parents[2]
    concrete = {
        p.name
        for p in backend.iterdir()
        if p.name != "core" and (p / "framework/provider").is_dir()
    }
    schemas = {
        source.table.split(".")[0] for source in provider_storage.sources.values()
    }
    for path in (backend / "core").rglob("*.py"):
        tree = ast.parse(path.read_text())
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom):
                module = node.module or ""
                assert not any(
                    module.startswith(f"backend.{name}.") for name in concrete
                ), path
                if module == "backend":
                    assert not any(alias.name in concrete for alias in node.names), path
            elif isinstance(node, ast.Import):
                assert not any(
                    alias.name.startswith(f"backend.{name}.")
                    for alias in node.names
                    for name in concrete
                ), path
            elif isinstance(node, ast.Constant) and isinstance(node.value, str):
                assert not any(
                    node.value.startswith(f"{schema}.") for schema in schemas
                ), path


def test_all_registered_storage_queries_use_valid_provider_columns() -> None:
    assert provider_storage.sources
    for source in provider_storage.available():
        source.metadata_statement(True).compile(dialect=postgresql.dialect())
        source.metadata_statement(False).compile(dialect=postgresql.dialect())
        if source.path:
            source.files_statement().compile(dialect=postgresql.dialect())
    metadata = DownloadBrowseAccess.metadata()
    select(metadata).compile(dialect=postgresql.dialect())
    assert {source.table for source in provider_storage.available() if source.path} == {
        "spotify.track",
        "spotify_scrapper.track",
        "youtube_music.track",
        "youtube.video",
        "rockit.song",
        "rockit.video",
    }


def test_empty_provider_registry_has_valid_empty_queries() -> None:
    storage = ProviderStorage()
    for index in (storage.metadata(), storage.files()):
        statement = str(
            select(index).compile(
                dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True}
            )
        )
        assert "WHERE false" in statement


async def test_playlist_operations_route_to_the_owning_provider(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    provider = BaseMediaProvider()
    provider.set_info(501, "Custom playlists")
    add = AsyncMock(
        return_value=AResult(code=AResultCode.OK, message="OK", result=True)
    )
    expand = AsyncMock(
        return_value=AResult(code=AResultCode.OK, message="OK", result=True)
    )
    monkeypatch.setattr(provider, "add_media_to_playlist_async", add)
    monkeypatch.setattr(provider, "set_media_expanded_async", expand)
    monkeypatch.setattr(providers, "_providers", [provider])
    monkeypatch.setattr(
        Media,
        "get_media_from_public_id_async",
        AsyncMock(
            return_value=AResult(
                code=AResultCode.OK,
                message="OK",
                result=MediaModel(id=5, public_id="list", provider_id=501),
            )
        ),
    )
    session = AsyncMock(spec=AsyncSession)
    assert (
        await providers.add_media_to_playlist_async(session, "list", 9, "song")
    ).is_ok()
    assert (
        await providers.set_media_expanded_async(session, 9, "list", "song", True)
    ).is_ok()
    add.assert_awaited_once_with(
        session=session, playlist_public_id="list", user_id=9, media_public_id="song"
    )
    expand.assert_awaited_once_with(
        session=session,
        playlist_public_id="list",
        user_id=9,
        media_public_id="song",
        is_expanded=True,
    )


async def test_missing_or_read_only_playlist_provider_is_handled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        Media,
        "get_media_from_public_id_async",
        AsyncMock(
            return_value=AResult(
                code=AResultCode.OK,
                message="OK",
                result=MediaModel(id=5, public_id="list", provider_id=501),
            )
        ),
    )
    session = AsyncMock(spec=AsyncSession)
    monkeypatch.setattr(providers, "_providers", [])
    result = await providers.add_media_to_playlist_async(session, "list", 9, "song")
    assert result.code() == AResultCode.NOT_FOUND
    provider = BaseMediaProvider()
    provider.set_info(501, "Read only")
    monkeypatch.setattr(providers, "_providers", [provider])
    result = await providers.add_media_to_playlist_async(session, "list", 9, "song")
    assert result.code() == AResultCode.NOT_IMPLEMENTED


async def test_provider_controls_concurrency_without_a_known_name(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    provider = Mock(spec=BaseMediaProvider)
    provider.get_name.return_value = "New source"
    provider.download_concurrency_limit.return_value = 1
    monkeypatch.setattr(providers, "find_provider", Mock(return_value=provider))
    manager = DownloadsManager()
    get_semaphore = (
        manager._get_provider_semaphore  # pyright: ignore[reportPrivateUsage]
    )
    semaphore = get_semaphore(501)
    await semaphore.acquire()
    assert semaphore.locked()
    semaphore.release()
