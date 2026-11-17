from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from core.framework.media.lyricsSearch import LyricsSearch
from core.framework.media.search import ProviderSearch
from core.framework.provider.baseLyricsProvider import BaseLyricsProvider
from core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from core.responses.baseVideoResponse import BaseVideoResponse
from lrclib.access.lyricsAccess import LyricsAccess
from result import Result, ResultCode

pytestmark = pytest.mark.unit


def ok[T](value: T) -> Result[T]:
    return Result(code=ResultCode.OK, message="OK", result=value)


async def test_lyrics_search_batches_hydration_and_preserves_rank(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from core.framework.media import lyricsSearch

    source = BaseLyricsProvider()
    lookup = AsyncMock(return_value=ok({11: 0.2, 12: 0.9, 13: 0.7}))
    monkeypatch.setattr(source, "search_lyrics_async", lookup)
    monkeypatch.setattr(lyricsSearch.providers, "get_lyrics_providers", lambda: [source])
    monkeypatch.setattr(
        lyricsSearch.MediaAccess,
        "get_medias_from_ids_async",
        AsyncMock(
            return_value=ok(
                [
                    SimpleNamespace(
                        id=i, public_id=str(i), provider_id=7, media_type_key=4 if i < 13 else 5
                    )
                    for i in (11, 12, 13)
                ]
            )
        ),
    )
    owner = Mock()
    owner.get_songs_async = AsyncMock(
        return_value=ok(
            [
                BaseSongWithAlbumResponse.model_construct(
                    type="song",
                    publicId=str(i),
                    name=f"Song {i}",
                    provider="test",
                    providerUrl=f"/test/{i}",
                    imageUrl="",
                    artists=[],
                    downloaded=True,
                )
                for i in (11, 12)
            ]
        )
    )
    owner.get_videos_async = AsyncMock(
        return_value=ok(
            [
                BaseVideoResponse.model_construct(
                    type="video",
                    publicId="13",
                    name="Video",
                    provider="test",
                    providerUrl="/test/13",
                    imageUrl="",
                    artists=[],
                    downloaded=False,
                )
            ]
        )
    )
    monkeypatch.setattr(
        lyricsSearch.providers, "find_local_media_provider", Mock(return_value=owner)
    )
    result = await LyricsSearch().search_page_async(
        session=AsyncMock(spec=AsyncSession), query="hello world", limit=15
    )
    assert result.is_ok(), result.info()
    assert [item.publicId for item in result.result()] == ["12", "13", "11"]
    assert [item.lyricsScore for item in result.result()] == [0.9, 0.7, 0.2]
    assert result.result()[0].downloaded
    assert result.result()[1].type == "video"
    assert result.result()[0].url == "/song/12"
    owner.get_songs_async.assert_awaited_once()
    owner.get_videos_async.assert_awaited_once()


async def test_lyrics_failures_propagate_and_empty_matches_skip_hydration(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from core.framework.media import lyricsSearch

    source = BaseLyricsProvider()
    monkeypatch.setattr(lyricsSearch.providers, "get_lyrics_providers", lambda: [source])
    hydrate = AsyncMock()
    monkeypatch.setattr(lyricsSearch.MediaAccess, "get_medias_from_ids_async", hydrate)
    session = AsyncMock(spec=AsyncSession)
    empty = await LyricsSearch().search_page_async(session=session, query="missing")
    assert empty.is_ok() and not empty.result()
    hydrate.assert_not_awaited()
    monkeypatch.setattr(
        source,
        "search_lyrics_async",
        AsyncMock(
            return_value=Result(code=ResultCode.GENERAL_ERROR, message="database unavailable")
        ),
    )
    failed = await LyricsSearch().search_page_async(session=session, query="hello")
    assert failed.is_not_ok()
    assert failed.message() == "database unavailable"
    hydrate.assert_not_awaited()


async def test_non_lyrical_categories_skip_database() -> None:
    session = AsyncMock(spec=AsyncSession)
    result = await LyricsAccess.search_async(
        session=session, query="hello", limit=15, media_type="album"
    )
    assert result.is_ok() and not result.result()
    session.execute.assert_not_awaited()


def test_lyrics_search_is_automatic_when_a_lyrics_provider_is_enabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from core.framework.media import search

    monkeypatch.setattr(search.providers, "get_media_providers", Mock(return_value=[]))
    monkeypatch.setattr(search.providers, "get_lyrics_providers", lambda: [BaseLyricsProvider()])
    catalog = ProviderSearch().catalog()
    assert len(catalog.providers) == 1
    assert catalog.providers[0].id == "lyrics"
    assert not catalog.providers[0].onDemand


def test_provider_owned_lyrics_migration_is_discovered_once() -> None:
    from core.access.db.migrations import MIGRATIONS, validate_migrations

    validate_migrations()
    entries = [entry for entry in MIGRATIONS if entry.name == "index_lyrics_search"]
    assert len(entries) == 1
    assert entries[0].version == 7
