# pyright: reportPrivateUsage=false
"""Local playback is independent of the provider supplying a remote search hit."""

from contextlib import asynccontextmanager
from collections.abc import AsyncIterator
from pathlib import Path
from types import SimpleNamespace
from typing import cast
from unittest.mock import AsyncMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.framework.models.localSong import LocalSong
from backend.core.framework.provider.baseProvider import BaseProvider
from backend.core.framework.provider.baseMediaProvider import BaseMediaProvider
from backend.core.framework.providers.providers import Providers
from backend.core.framework.media import localSearch
from backend.core.framework.media.media import Media
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.searchResponse import (
    BaseSearchResultsItem,
    ArtistSearchResultsItem,
)

pytestmark = pytest.mark.unit


class ArchivedSource(BaseMediaProvider):
    def __init__(self, songs: list[LocalSong]) -> None:
        self.songs = songs
        self.set_info(provider_id=42, provider_name="old-offline-source")

    async def find_local_songs_async(
        self, session: AsyncSession, titles: list[str]
    ) -> AResult[list[LocalSong]]:
        return AResult(code=AResultCode.OK, message="OK", result=self.songs)

    async def get_local_songs_async(
        self, session: AsyncSession, public_ids: list[str]
    ) -> AResult[list[BaseSongWithAlbumResponse]]:
        song = cast(
            BaseSongWithAlbumResponse,
            SimpleNamespace(publicId="local-a", downloaded=True),
        )
        return AResult(code=AResultCode.OK, message="OK", result=[song])

    async def search_media_async(
        self, session: AsyncSession, query: str
    ) -> AResult[list[BaseSearchResultsItem]]:
        raise AssertionError("Offline source must never be searched remotely")


def hit(title: str = "Song", artists: list[str] | None = None) -> BaseSearchResultsItem:
    return BaseSearchResultsItem(
        type="song",
        name=title,
        provider="new-online-source",
        providerUrl="https://new.test/song",
        imageUrl="",
        artists=[
            ArtistSearchResultsItem(name=name, url="")
            for name in (artists if artists is not None else ["Artist"])
        ],
        downloaded=False,
        publicId=None,
        url=None,
    )


@pytest.mark.parametrize(
    "title,artists,expected",
    [
        ("song", ["ARTIST"], True),
        ("  SONG  ", ["Artist"], True),
        ("Song (Live)", ["Artist"], False),
        ("Song", ["Another Artist"], False),
        ("Song", [], False),
    ],
)
async def test_resolves_other_source_without_searching_offline_provider(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    title: str,
    artists: list[str],
    expected: bool,
) -> None:
    file = tmp_path / "already-downloaded.mp3"
    file.write_bytes(b"audio exists locally")
    archive = ArchivedSource(
        [
            LocalSong(
                public_id="local-a",
                name="Song",
                artists=["Artist"],
                file_path=str(file),
            )
        ]
    )
    registry = Providers()
    registry._providers = [BaseProvider()]
    registry._providers[0].set_info(provider_id=42, provider_name="old-offline-source")
    registry._offline_media_providers = [archive]
    monkeypatch.setattr(localSearch, "providers", registry)

    @asynccontextmanager
    async def scope() -> AsyncIterator[AsyncSession]:
        yield cast(AsyncSession, AsyncMock())

    monkeypatch.setattr(localSearch.rockit_db, "session_scope_async", scope)
    original = hit(title=title, artists=artists)
    results = await localSearch.resolve_local_results(items=[original])
    assert bool(results[0].downloaded) is expected
    assert results[0].publicId == ("local-a" if expected else None)
    assert original.downloaded is False  # Remote cache remains unchanged.
    assert registry.find_media_provider(42) is None
    assert registry.find_local_media_provider(42) is archive
    assert registry.get_media_providers() == []  # No remote/download reactivation.


@pytest.mark.parametrize("missing,ambiguous", [(True, False), (False, True)])
async def test_missing_file_and_ambiguous_editions_are_not_auto_played(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, missing: bool, ambiguous: bool
) -> None:
    file = tmp_path / "audio.mp3"
    if not missing:
        file.write_bytes(b"local")
    songs = [
        LocalSong(public_id="one", name="Song", artists=["Artist"], file_path=str(file))
    ]
    if ambiguous:
        songs.append(
            LocalSong(
                public_id="two", name="Song", artists=["Artist"], file_path=str(file)
            )
        )
    registry = Providers()
    registry._providers = []
    registry._offline_media_providers = [ArchivedSource(songs)]
    monkeypatch.setattr(localSearch, "providers", registry)

    @asynccontextmanager
    async def scope() -> AsyncIterator[AsyncSession]:
        yield cast(AsyncSession, AsyncMock())

    monkeypatch.setattr(localSearch.rockit_db, "session_scope_async", scope)
    result = await localSearch.resolve_local_results(items=[hit()])
    assert result[0].downloaded is False
    assert result[0].publicId is None


async def test_disabled_provider_song_is_retrieved_through_local_capability(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from backend.core.framework.media import media as module

    registry = Providers()
    registry._providers = []
    registry._offline_media_providers = [ArchivedSource([])]
    monkeypatch.setattr(module, "providers", registry)
    monkeypatch.setattr(
        module.MediaAccess,
        "get_media_from_public_id_async",
        AsyncMock(
            return_value=AResult(
                code=AResultCode.OK,
                message="OK",
                result=SimpleNamespace(provider_id=42),
            )
        ),
    )
    result = await Media.get_song_async(
        session=cast(AsyncSession, AsyncMock()), public_id="local-a"
    )
    assert result.is_ok(), result.info()
    assert result.result().publicId == "local-a"


def test_loading_local_capability_does_not_initialize_remote_api(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from importlib import import_module

    registry_module = import_module("backend.core.framework.providers.providers")

    archive = ArchivedSource([])
    remote_init = AsyncMock(
        side_effect=AssertionError("Remote initialization must stay disabled")
    )
    monkeypatch.setattr(archive, "async_init", remote_init)
    monkeypatch.setattr(
        registry_module, "import_module", lambda _: SimpleNamespace(provider=archive)
    )
    registry = Providers()
    registry._providers = []
    registry._load_local_provider(
        module_path="archived.source", provider_id=42, name="Renamed source"
    )
    assert registry.find_local_media_provider(42) is archive
    assert registry.find_media_provider(42) is None
    remote_init.assert_not_called()
