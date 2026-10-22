# pyright: reportPrivateUsage=false
import asyncio
from typing import Any, AsyncIterator, Literal, TypeVar
from sqlalchemy.ext.asyncio import AsyncSession
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, Mock

import pytest
from pydantic import ValidationError

from backend.core.aResult import AResult, AResultCode
from backend.core.framework.media import search
from backend.core.requests.searchProviderRequest import SearchProviderRequest
from backend.core.responses.searchResponse import BaseSearchResultsItem

pytestmark = pytest.mark.unit

T = TypeVar("T")
SearchSetup = tuple[search.ProviderSearch, Mock, list[AsyncMock]]


def ok(value: T) -> AResult[T]:
    return AResult(code=AResultCode.OK, message="OK", result=value)


def item(
    index: int,
    kind: Literal["song", "album", "artist", "playlist", "video", "radio"] = "song",
) -> BaseSearchResultsItem:
    return BaseSearchResultsItem(
        type=kind,
        name=str(index),
        providerUrl=f"/{kind}/{index}",
        imageUrl="",
        artists=[],
        provider="test",
        downloaded=False,
        url=None,
    )


@pytest.fixture
def setup(monkeypatch: pytest.MonkeyPatch) -> SearchSetup:
    sessions: list[AsyncMock] = []

    @asynccontextmanager
    async def scope() -> AsyncIterator[AsyncMock]:
        session = AsyncMock()
        sessions.append(session)
        yield session

    monkeypatch.setattr(search.rockit_db, "session_scope_async", scope)
    provider = Mock()
    provider.search_page_size.return_value = 100
    provider.search_supports_category.return_value = False
    provider.search_page_async = AsyncMock(
        return_value=ok([item(i) for i in range(15)])
    )
    provider.get_name.return_value = "test"
    monkeypatch.setattr(
        search.providers, "get_media_providers", Mock(return_value=[provider])
    )
    return search.ProviderSearch(), provider, sessions


async def test_coalesces_identical_queries_and_reuses_cache(setup: SearchSetup) -> None:
    service, provider, sessions = setup
    first, second = await asyncio.gather(
        service.search_async("test", "  Daft   Punk "),
        service.search_async("test", "daft punk"),
    )
    assert first.is_ok() and second.is_ok()
    cached = await service.search_async("test", "DAFT PUNK")
    assert cached.is_ok() and len(cached.result().results) == 15
    assert provider.search_page_async.await_count == 1
    assert len(sessions) == 1
    assert first.result().hasMoreTypes == ["song"]


async def test_expansion_reuses_provider_window_between_categories(
    setup: SearchSetup,
) -> None:
    service, provider, _ = setup
    provider.search_page_async.return_value = ok(
        [item(i, kind) for kind in ("song", "album") for i in range(30)]
    )
    songs = await service.search_async("test", "music", 30, "song")
    albums = await service.search_async("test", "music", 30, "album")
    assert songs.is_ok() and albums.is_ok()
    assert all(i.type == "song" for i in songs.result().results)
    assert all(i.type == "album" for i in albums.result().results)
    assert provider.search_page_async.await_count == 1
    assert provider.search_page_async.call_args.kwargs["media_type"] is None


async def test_filtered_provider_only_requests_selected_category(
    setup: SearchSetup,
) -> None:
    service, provider, _ = setup
    provider.search_supports_category.return_value = True
    result = await service.search_async("test", "music", 30, "album")
    assert result.is_ok()
    assert provider.search_page_async.call_args.kwargs["media_type"] == "album"


async def test_failures_cool_down_provider_even_for_different_queries(
    setup: SearchSetup,
) -> None:
    service, provider, sessions = setup
    provider.search_page_async.return_value = AResult(
        code=AResultCode.GENERAL_ERROR, message="rate limited"
    )
    assert (await service.search_async("test", "first")).is_not_ok()
    assert (await service.search_async("test", "different")).is_not_ok()
    assert provider.search_page_async.await_count == 1
    sessions[0].rollback.assert_awaited_once()
    service._cooldowns["test"] = (0, service._cooldowns["test"][1])
    assert (await service.search_async("test", "different")).is_not_ok()
    assert provider.search_page_async.await_count == 2


async def test_expired_cache_and_bounded_cache(setup: SearchSetup) -> None:
    service, provider, _ = setup
    service.CACHE_SIZE = 2
    await service.search_async("test", "first")
    key = next(iter(service._cache))
    service._cache[key] = (0, service._cache[key][1])
    await service.search_async("test", "first")
    assert provider.search_page_async.await_count == 2
    await service.search_async("test", "second")
    await service.search_async("test", "third")
    assert len(service._cache) == 2


async def test_concurrency_is_bounded_and_sessions_are_independent(
    setup: SearchSetup,
) -> None:
    service, provider, sessions = setup
    active = peak = 0

    async def slow(**kwargs: object) -> AResult[list[BaseSearchResultsItem]]:
        nonlocal active, peak
        active += 1
        peak = max(peak, active)
        await asyncio.sleep(0.005)
        active -= 1
        return ok([])

    provider.search_page_async.side_effect = slow
    results = await asyncio.gather(
        *(service.search_async("test", f"query {i}") for i in range(8))
    )
    assert all(result.is_ok() for result in results)
    assert peak == 4
    assert len({id(session) for session in sessions}) == 8


async def test_disconnected_client_does_not_cancel_shared_work(
    setup: SearchSetup,
) -> None:
    service, provider, _ = setup
    started, finish = asyncio.Event(), asyncio.Event()

    async def slow(**kwargs: object) -> AResult[list[BaseSearchResultsItem]]:
        started.set()
        await finish.wait()
        return ok([])

    provider.search_page_async.side_effect = slow
    first = asyncio.create_task(service.search_async("test", "shared"))
    await started.wait()
    first.cancel()
    with pytest.raises(asyncio.CancelledError):
        await first
    second = asyncio.create_task(service.search_async("test", "shared"))
    finish.set()
    assert (await second).is_ok()
    assert provider.search_page_async.await_count == 1
    assert not service._pending


async def test_timeout_returns_failure_and_cleans_pending(setup: SearchSetup) -> None:
    service, provider, _ = setup
    service.TIMEOUT = 0.001

    async def slow(**kwargs: object) -> AResult[list[BaseSearchResultsItem]]:
        await asyncio.sleep(1)
        return ok([])

    provider.search_page_async.side_effect = slow
    assert (await service.search_async("test", "timeout")).is_not_ok()
    assert not service._pending


async def test_terminal_window_does_not_offer_more(setup: SearchSetup) -> None:
    service, provider, _ = setup
    provider.search_page_async.return_value = ok([item(i) for i in range(100)])
    result = await service.search_async("test", "music", 100)
    assert result.is_ok() and result.result().hasMoreTypes == []


@pytest.mark.parametrize(
    "payload",
    [
        {"query": "x", "providerId": "test"},
        {"query": "music", "providerId": "test", "limit": 101},
        {"query": "music", "providerId": "test", "mediaType": "invalid"},
    ],
)
def test_request_rejects_invalid_parameters(payload: dict[str, Any]) -> None:
    with pytest.raises(ValidationError):
        SearchProviderRequest(**payload)


async def test_youtube_http_search_offloads_blocking_request(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from backend.youtube.framework import youtubeApi

    response = Mock(
        status_code=200,
        json=lambda: {
            "items": [{"id": {"videoId": "video"}, "snippet": {"title": "music"}}]
        },
    )
    offload = AsyncMock(return_value=response)
    monkeypatch.setattr(youtubeApi.asyncio, "to_thread", offload)
    result = await youtubeApi.youtube_api.search_videos_async("music")
    assert result.is_ok()
    offload.assert_awaited_once()
    args, kwargs = offload.call_args
    assert args[0] is youtubeApi.requests.get
    assert args[1].endswith("/search")
    assert kwargs["params"]["q"] == "music"
    assert kwargs["timeout"] == 10


def test_catalog_marks_costly_providers_as_on_demand(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from backend.core.framework.provider.baseMediaProvider import BaseMediaProvider

    class Searchable(BaseMediaProvider):
        async def search_media_async(
            self, session: AsyncSession, query: str
        ) -> AResult[list[BaseSearchResultsItem]]:
            return ok([])

        def search_on_demand(self) -> bool:
            return True

    provider = Searchable()
    provider.set_info(7, "video")
    monkeypatch.setattr(
        search.providers, "get_media_providers", lambda: [provider, BaseMediaProvider()]
    )
    catalog = search.ProviderSearch().catalog()
    assert len(catalog.providers) == 1
    assert catalog.providers[0].id == "video"
    assert catalog.providers[0].onDemand


async def test_empty_provider_results_do_not_trigger_failure_cooldown(
    setup: SearchSetup,
) -> None:
    service, provider, _ = setup
    provider.search_page_async.return_value = AResult(
        code=AResultCode.NOT_FOUND, message="No matches"
    )
    result = await service.search_async("test", "missing")
    assert result.is_ok() and result.result().results == []
    assert (await service.search_async("test", "different")).is_ok()
    assert provider.search_page_async.await_count == 2
    assert not service._cooldowns


def test_search_vocabulary_is_translated_and_has_no_literal_image_labels() -> None:
    import re
    from pathlib import Path
    from xml.etree import ElementTree
    from zipfile import ZipFile

    root = Path(__file__).resolve().parents[3]
    files = list((root / "frontend/apps/web/components/Search").rglob("*.tsx"))
    files.extend(
        root / "frontend/apps/web/components/MediaContextMenu/actions" / name
        for name in ("LibraryActions.tsx", "DownloadActions.tsx")
    )
    files.append(root / "frontend/apps/web/components/ContextMenu/Content.tsx")
    keys: set[str] = set()
    for file in files:
        source = file.read_text()
        keys.update(
            re.findall(r"(?:\$vocabulary|vocabulary)\.([A-Z][A-Z_0-9]+)", source)
        )
        assert not re.search(r'alt="[^"]+"|alt=\{`', source), file

    namespace = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    with ZipFile(root / "Vocabulary.xlsx") as workbook:
        shared: list[str] = []
        if "xl/sharedStrings.xml" in workbook.namelist():
            shared = [
                "".join(node.itertext())
                for node in ElementTree.fromstring(
                    workbook.read("xl/sharedStrings.xml")
                ).findall("s:si", namespace)
            ]
        sheet = ElementTree.fromstring(workbook.read("xl/worksheets/sheet1.xml"))
    rows: dict[str, dict[str, str]] = {}
    for row in sheet.findall("s:sheetData/s:row", namespace)[2:]:
        values: dict[str, str] = {}
        for cell in row.findall("s:c", namespace):
            column = re.sub(r"[0-9]", "", cell.attrib["r"])
            value = cell.find("s:v", namespace)
            inline = cell.find("s:is", namespace)
            text = (
                "".join(inline.itertext())
                if inline is not None
                else (value.text or "") if value is not None else ""
            )
            if cell.attrib.get("t") == "s":
                text = shared[int(text)]
            values[column] = text
        if values.get("A"):
            assert values["A"] not in rows, f"Duplicate vocabulary key: {values['A']}"
            rows[values["A"]] = values
    assert (
        keys and keys <= rows.keys()
    ), f"Missing vocabulary keys: {keys - rows.keys()}"
    for key in keys:
        translations = [rows[key].get(column, "") for column in ("B", "C", "D")]
        assert all(translations), f"Missing translation: {key}"
        tokens = [set(re.findall(r"\{\w+\}", text)) for text in translations]
        assert (
            tokens[0] == tokens[1] == tokens[2]
        ), f"Mismatched translation placeholders: {key}"
