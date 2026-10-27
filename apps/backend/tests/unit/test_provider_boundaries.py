"""Keep core independent of installed providers and exercise extension contracts."""

import ast
from pathlib import Path
from unittest.mock import AsyncMock, Mock

import pytest
from sqlalchemy import select
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.downloadBrowseAccess import DownloadBrowseAccess
from core.access.providerStorage import ProviderStorage, provider_storage
from core.framework import providers
from core.framework.downloader.downloadsManager import DownloadsManager
from core.framework.media.media import Media
from core.framework.models.media import MediaModel
from core.framework.provider.baseMediaProvider import BaseMediaProvider
from result import Result, ResultCode

pytestmark = pytest.mark.unit


def test_core_has_no_concrete_provider_imports_or_schema_names() -> None:
    backend = Path(__file__).resolve().parents[2]
    concrete = {
        p.name
        for p in backend.iterdir()
        if p.name != "core" and (p / "framework/provider").is_dir()
    }
    schemas = {source.key.split(".")[0] for source in provider_storage.sources.values()}
    for path in (backend / "core").rglob("*.py"):
        tree = ast.parse(path.read_text())
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom):
                module = node.module or ""
                assert not any(module.startswith(f"{name}.") for name in concrete), path
                if module == "backend":
                    assert not any(alias.name in concrete for alias in node.names), path
            elif isinstance(node, ast.Import):
                assert not any(
                    alias.name.startswith(f"{name}.") for alias in node.names for name in concrete
                ), path
            elif isinstance(node, ast.Constant) and isinstance(node.value, str):
                assert not any(node.value.startswith(f"{schema}.") for schema in schemas), path


def test_all_registered_storage_queries_use_valid_provider_columns() -> None:
    assert provider_storage.sources
    for source in provider_storage.sources.values():
        source.metadata_statement(True).compile(dialect=postgresql.dialect())
        source.metadata_statement(False).compile(dialect=postgresql.dialect())
        if source.files_statement is not None:
            source.files_statement().compile(dialect=postgresql.dialect())
        if source.audio_tags_statement is not None:
            tags = source.audio_tags_statement([1, 2])
            tags.compile(dialect=postgresql.dialect())
            assert set(tags.selected_columns.keys()) == {
                "id",
                "artists",
                "album",
                "album_artists",
                "date",
                "track",
                "disc",
                "isrc",
                "image_id",
            }
    metadata = DownloadBrowseAccess.metadata()
    select(metadata).compile(dialect=postgresql.dialect())
    assert {
        source.key
        for source in provider_storage.sources.values()
        if source.files_statement is not None
    } == {
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
    add = AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=True))
    expand = AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=True))
    monkeypatch.setattr(provider, "add_media_to_playlist_async", add)
    monkeypatch.setattr(provider, "set_media_expanded_async", expand)
    monkeypatch.setattr(providers, "_providers", [provider])
    monkeypatch.setattr(
        Media,
        "get_media_from_public_id_async",
        AsyncMock(
            return_value=Result(
                code=ResultCode.OK,
                message="OK",
                result=MediaModel(id=5, public_id="list", provider_id=501),
            )
        ),
    )
    session = AsyncMock(spec=AsyncSession)
    assert (await providers.add_media_to_playlist_async(session, "list", 9, "song")).is_ok()
    assert (await providers.set_media_expanded_async(session, 9, "list", "song", True)).is_ok()
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
            return_value=Result(
                code=ResultCode.OK,
                message="OK",
                result=MediaModel(id=5, public_id="list", provider_id=501),
            )
        ),
    )
    session = AsyncMock(spec=AsyncSession)
    monkeypatch.setattr(providers, "_providers", [])
    result = await providers.add_media_to_playlist_async(session, "list", 9, "song")
    assert result.code() == ResultCode.NOT_FOUND
    provider = BaseMediaProvider()
    provider.set_info(501, "Read only")
    monkeypatch.setattr(providers, "_providers", [provider])
    result = await providers.add_media_to_playlist_async(session, "list", 9, "song")
    assert result.code() == ResultCode.NOT_IMPLEMENTED


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


async def test_storage_mutations_are_batched_and_failures_stop_dispatch() -> None:
    from core.access.providerStorage import MediaStorage

    storage = ProviderStorage()
    metadata = Mock()
    first = AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=["a"]))
    failure = AsyncMock(return_value=Result(code=ResultCode.BAD_REQUEST, message="Cannot detach"))
    skipped = AsyncMock()
    storage.register(
        MediaStorage(key="opaque key", metadata_statement=metadata, clear_files_async=first),
        MediaStorage(key="read only", metadata_statement=metadata),
        MediaStorage(key="failing", metadata_statement=metadata, clear_files_async=failure),
        MediaStorage(key="later", metadata_statement=metadata, clear_files_async=skipped),
    )
    session = AsyncMock(spec=AsyncSession)
    empty = await storage.clear_files_async(session=session, media_ids=[])
    assert empty.is_ok() and empty.result() == []
    first.assert_not_awaited()
    ids = list(range(500))
    result = await storage.clear_files_async(session=session, media_ids=ids)
    assert result.code() == ResultCode.BAD_REQUEST
    first.assert_awaited_once_with(session, ids)
    failure.assert_awaited_once_with(session, ids)
    skipped.assert_not_awaited()
    session.commit.assert_not_awaited()


@pytest.mark.parametrize("source", ["spotify", "spotifyScrapper", "youtube", "youtubeMusic"])
async def test_downloader_health_is_checked_without_an_active_youtube_provider(
    monkeypatch: pytest.MonkeyPatch, source: str
) -> None:
    from importlib import import_module

    from youtube.framework.potProvider import PotProvider

    module_names = {
        "spotify": "spotifyProvider",
        "spotifyScrapper": "spotifyScrapperProvider",
        "youtube": "yotubeProvider",
        "youtubeMusic": "youtubeMusicProvider",
    }
    module = import_module(f"{source}.framework.provider.{module_names[source]}")
    check = AsyncMock(
        return_value=Result(code=ResultCode.CONFIGURATION_ERROR, message="Missing runtime")
    )
    monkeypatch.setattr(PotProvider, "check_health_async", check)
    monkeypatch.setattr(providers, "_providers", [])
    health = await module.provider.check_health_async()
    assert health.code() == ResultCode.CONFIGURATION_ERROR
    assert health.message() == "Missing runtime"
    check.assert_awaited_once_with(max_age_seconds=30.0)
