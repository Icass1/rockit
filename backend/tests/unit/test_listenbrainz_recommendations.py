import asyncio
from datetime import datetime, timezone
from email.utils import format_datetime
from pathlib import Path
from typing import Any

import httpx
import pytest
from cachetools import TTLCache
from filelock import FileLock
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.framework import listenbrainzRecommendation as lb
from backend.core.framework.listenbrainzRecommendation import ListenBrainzRecommendation
from backend.core.framework.models.recommendation import RecommendationCandidate
from backend.core.framework.recommendation import Recommendation
from backend.tests.unit.test_recommendations import service as service

pytestmark = pytest.mark.unit
PLAYLIST = "12345678-1234-4234-8234-123456789abc"
LISTING = {
    "playlists": [
        {
            "playlist": {
                "identifier": f"https://listenbrainz.org/playlist/{PLAYLIST}",
                "date": "2026-10-18",
            }
        }
    ]
}
TRACKS = {
    "playlist": {
        "track": [
            {
                "title": "Second",
                "creator": "Two",
                "identifier": ["https://musicbrainz.org/recording/another-id"],
            }
        ]
    }
}


@pytest.fixture
def clock(monkeypatch: pytest.MonkeyPatch) -> list[float]:
    value = [datetime(2026, 10, 18, tzinfo=timezone.utc).timestamp()]
    monkeypatch.setattr(lb.time, "time", lambda: value[0])

    async def advance(delay: float) -> None:
        value[0] += delay

    monkeypatch.setattr(lb.asyncio, "sleep", advance)
    return value


def provider(
    tmp_path: Path, handler: Any, timeout: float = 1.0
) -> ListenBrainzRecommendation:
    def factory(**kwargs: Any) -> httpx.AsyncClient:
        return httpx.AsyncClient(transport=httpx.MockTransport(handler), **kwargs)

    return ListenBrainzRecommendation(
        enabled=True, timeout=timeout, directory=tmp_path, client_factory=factory
    )


async def test_success_matches_existing_model_and_caches_batches(
    service: tuple[AsyncSession, list[RecommendationCandidate]],
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    clock: list[float],
) -> None:
    requests: list[httpx.Request] = []
    sent_at: list[float] = []

    def handle(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        sent_at.append(clock[0])
        assert request.headers["User-Agent"].startswith("Rockit/")
        assert "Authorization" not in request.headers
        assert request.content == b""
        if request.url.path.endswith("/recommendations"):
            return httpx.Response(200, json=LISTING)
        assert request.url.path == f"/1/playlist/{PLAYLIST}"
        return httpx.Response(200, json=TRACKS)

    external = provider(tmp_path=tmp_path, handler=handle)
    monkeypatch.setattr(Recommendation, "external", external)
    result = await Recommendation.get_async(
        session=service[0], user_id=1, external_username="test user"
    )
    assert result.is_ok()
    response = result.result()
    assert response.provider == "listenbrainz"
    assert response.songs[0].publicId == "b"
    assert response.songs[0].audioUrl == "http://test/rockit/audio/b"
    assert response.songs[0].provider == "RockIt"
    assert sent_at[1] - sent_at[0] >= 1
    assert len(requests) == 2
    await Recommendation.get_async(
        session=service[0], user_id=1, external_username="test user"
    )
    assert len(requests) == 2


FAILURE_CASES: list[tuple[int, int, object]] = [
    (1, 204, None),
    (1, 400, {}),
    (1, 401, {}),
    (1, 403, {}),
    (1, 404, {}),
    (1, 429, {}),
    (1, 500, {}),
    (1, 503, {}),
    (1, 200, None),
    (1, 200, []),
    (1, 200, {}),
    (1, 200, {"playlists": []}),
    (1, 200, {"playlists": [{"playlist": {}}]}),
    (
        1,
        200,
        {
            "playlists": [
                {"playlist": {"identifier": "https://evil.example/playlist/1"}}
            ]
        },
    ),
    (
        1,
        200,
        {
            "playlists": [
                {
                    "playlist": {
                        "identifier": "https://listenbrainz.org/playlist/invalid"
                    }
                }
            ]
        },
    ),
    (2, 429, {}),
    (2, 503, {}),
    (2, 200, None),
    (2, 200, {"playlist": {"track": []}}),
    (2, 200, {"playlist": {"track": "invalid"}}),
    (
        2,
        200,
        {
            "playlist": {
                "track": [
                    None,
                    {"identifier": ["id"]},
                    {"title": "Second", "creator": 5},
                ]
            }
        },
    ),
    (2, 200, {"playlist": {"track": [{"title": "Unknown", "creator": "Elsewhere"}]}}),
]


@pytest.mark.parametrize("stage,status,payload", FAILURE_CASES)
async def test_external_response_failures_always_fall_back(
    service: tuple[AsyncSession, list[RecommendationCandidate]],
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    clock: list[float],
    stage: int,
    status: int,
    payload: object,
) -> None:
    calls = 0

    def handle(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        if stage == 2 and calls == 1:
            return httpx.Response(200, json=LISTING)
        return httpx.Response(
            status, content=b"invalid JSON" if payload is None else None, json=payload
        )

    external = provider(tmp_path=tmp_path, handler=handle)
    monkeypatch.setattr(Recommendation, "external", external)
    result = await Recommendation.get_async(
        session=service[0], user_id=1, external_username="tester"
    )
    assert result.is_ok()
    assert result.result().provider == "local"
    assert [s.publicId for s in result.result().songs] == ["a", "b"]
    # Transient failures/empty responses never refetch on every render.
    await Recommendation.get_async(
        session=service[0], user_id=1, external_username="tester"
    )
    assert calls <= 2


@pytest.mark.parametrize(
    "error",
    [
        httpx.ConnectError("private token"),
        httpx.ReadTimeout("private token"),
        httpx.RemoteProtocolError("broken"),
    ],
)
async def test_transport_failures_are_private_and_local(
    service: tuple[AsyncSession, list[RecommendationCandidate]],
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    error: Exception,
) -> None:
    def handle(request: httpx.Request) -> httpx.Response:
        raise error

    monkeypatch.setattr(
        Recommendation, "external", provider(tmp_path=tmp_path, handler=handle)
    )
    result = await Recommendation.get_async(
        session=service[0], user_id=1, external_username="tester"
    )
    assert result.is_ok() and result.result().provider == "local"
    assert len(result.result().songs) == 2
    assert "private token" not in result.result().model_dump_json()


async def test_deadline_cancels_slow_provider_and_releases_lock(
    service: tuple[AsyncSession, list[RecommendationCandidate]],
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    async def slow(request: httpx.Request) -> httpx.Response:
        await asyncio.Event().wait()
        return httpx.Response(200, json=LISTING)

    monkeypatch.setattr(
        Recommendation,
        "external",
        provider(tmp_path=tmp_path, handler=slow, timeout=0.1),
    )
    result = await asyncio.wait_for(
        Recommendation.get_async(
            session=service[0], user_id=1, external_username="tester"
        ),
        timeout=1,
    )
    assert result.is_ok() and len(result.result().songs) == 2
    assert result.result().provider == "local"
    with FileLock(str(tmp_path / "requests.lock")).acquire(timeout=0):
        pass


@pytest.mark.parametrize(
    "headers",
    [
        {"Retry-After": "120"},
        {
            "Retry-After": format_datetime(
                datetime(2026, 10, 18, 0, 2, tzinfo=timezone.utc)
            )
        },
        {"X-RateLimit-Remaining": "0", "X-RateLimit-Reset-In": "120"},
        {
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": str(
                datetime(2026, 10, 18, 0, 2, tzinfo=timezone.utc).timestamp()
            ),
        },
    ],
)
async def test_rate_limits_apply_across_instances(
    tmp_path: Path, clock: list[float], headers: dict[str, str]
) -> None:
    calls = 0

    def handle(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(429, headers=headers)

    first = provider(tmp_path=tmp_path, handler=handle)
    second = provider(tmp_path=tmp_path, handler=handle)
    assert await first.recommendations_async(username="one") == []
    assert float((tmp_path / "next-request").read_text()) >= clock[0] + 120
    assert await second.recommendations_async(username="two") == []
    assert calls == 1


async def test_rate_limit_exhaustion_on_success_stops_next_call(
    tmp_path: Path, clock: list[float]
) -> None:
    calls = 0

    def handle(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(
            200,
            json=LISTING,
            headers={"X-RateLimit-Remaining": "0", "X-RateLimit-Reset-In": "120"},
        )

    assert (
        await provider(tmp_path=tmp_path, handler=handle).recommendations_async(
            username="one"
        )
        == []
    )
    assert calls == 1


async def test_concurrent_clients_do_not_burst_requests(tmp_path: Path) -> None:
    entered, release = asyncio.Event(), asyncio.Event()
    calls = 0

    async def handle(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        entered.set()
        await release.wait()
        return httpx.Response(200, json={"playlists": []})

    first = provider(tmp_path=tmp_path, handler=handle)
    task = asyncio.create_task(first.recommendations_async(username="one"))
    await entered.wait()
    assert (
        await provider(tmp_path=tmp_path, handler=handle).recommendations_async(
            username="two"
        )
        == []
    )
    release.set()
    assert await task == []
    assert calls == 1


async def test_success_cache_expires_and_failures_are_not_permanent(
    tmp_path: Path, clock: list[float]
) -> None:
    calls = 0
    fail = True

    def handle(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        if fail:
            return httpx.Response(503)
        return httpx.Response(
            200,
            json=LISTING if request.url.path.endswith("recommendations") else TRACKS,
        )

    external = provider(tmp_path=tmp_path, handler=handle)
    external.cache = TTLCache(maxsize=10, ttl=100, timer=lambda: clock[0])
    external.cooldown = TTLCache(maxsize=10, ttl=60, timer=lambda: clock[0])
    assert await external.recommendations_async(username="one") == []
    fail = False
    clock[0] += 61
    assert await external.recommendations_async(username="one") == [("Second", "Two")]
    assert calls == 3
    assert await external.recommendations_async(username="one")
    assert calls == 3
    clock[0] += 101
    assert await external.recommendations_async(username="one")
    assert calls == 5


async def test_disabled_invalid_usernames_and_oversized_bodies(tmp_path: Path) -> None:
    calls = 0

    def handle(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(200, content=b"x" * 1_048_577)

    external = provider(tmp_path=tmp_path, handler=handle)
    for username in ("", "a" * 65, "a\nb"):
        assert await external.recommendations_async(username=username) == []
    external.enabled = False
    assert await external.recommendations_async(username="one") == []
    assert calls == 0
    external.enabled = True
    assert await external.recommendations_async(username="one") == []
    assert calls == 1
