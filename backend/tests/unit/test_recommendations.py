from dataclasses import replace
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, Mock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.access.recommendationAccess import RecommendationAccess
from backend.core.framework.localRecommendation import LocalRecommendation
from backend.core.framework.models.recommendation import (
    RecommendationCandidate as Candidate,
)
from backend.core.framework.recommendation import Recommendation
from backend.core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)
from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse

pytestmark = pytest.mark.unit
NOW = datetime(2026, 10, 18, tzinfo=timezone.utc)


def song(candidate: Candidate) -> BaseSongWithAlbumResponse:
    artists = [
        BaseArtistResponse(
            provider="RockIt",
            publicId=f"artist-{a}",
            url="",
            providerUrl="",
            name=a,
            imageUrl="",
            dominantColor="",
        )
        for a in candidate.artists
    ]
    return BaseSongWithAlbumResponse(
        provider="RockIt",
        publicId=candidate.public_id,
        providerUrl="",
        name=candidate.name,
        artists=artists,
        audioUrl=f"http://test/rockit/audio/{candidate.public_id}",
        downloaded=True,
        imageUrl="",
        dominantColor="",
        duration_ms=180000,
        discNumber=1,
        trackNumber=1,
        album=BaseAlbumWithoutSongsResponse(
            provider="RockIt",
            publicId="album",
            url="",
            providerUrl="",
            name=candidate.album,
            artists=artists,
            releaseDate="",
            imageUrl="",
            dominantColor="",
        ),
    )


def rank(candidates: list[Candidate], **kwargs: object) -> list[str]:
    return LocalRecommendation.rank(candidates=candidates, now=NOW, **kwargs)  # type: ignore[arg-type]


def test_empty_missing_and_unplayable_metadata() -> None:
    assert rank([]) == []
    assert (
        rank([Candidate("blank", "  "), Candidate("missing", "Title", playable=False)])
        == []
    )
    assert rank([Candidate("one", "Title"), Candidate("two", "Other")]) == [
        "one",
        "two",
    ]
    assert rank([Candidate("one", "Title")], limit=0) == []


def test_favorites_and_listens_personalize_unheard_candidates() -> None:
    seed = Candidate(
        "seed",
        "Favorite",
        ("  BÖRK  ",),
        liked=True,
        playable=False,
        plays=20,
        last_played=NOW - timedelta(days=2),
    )
    candidates = [
        seed,
        Candidate("a", "Unrelated", ("Someone",)),
        Candidate("z", "Related", ("börk",)),
    ]
    assert rank(candidates)[0] == "z"
    assert (
        rank([replace(seed, liked=False, plays=0, last_played=None), *candidates[1:]])[
            0
        ]
        == "a"
    )


def test_recent_and_current_recordings_exclude_provider_duplicates() -> None:
    candidates = [
        Candidate(
            "recent", "Ｔｉｔｌｅ", ("ARTIST",), last_played=NOW - timedelta(hours=1)
        ),
        Candidate("other-provider", "Title", ("artist",)),
        Candidate("current", "Playing", ("Artist",)),
        Candidate("copy", "Playing", ("artist",)),
        Candidate("safe", "Next"),
    ]
    assert rank(candidates, excluded={"current"}) == ["safe"]


def test_normalized_duplicate_filtering_keeps_different_artists() -> None:
    candidates = [
        Candidate("a", "Ｔｉｔｌｅ", ("artist",)),
        Candidate("b", "title", (" ARTIST ",)),
        Candidate("c", "Title", ("another",)),
    ]
    assert set(rank(candidates)) == {"a", "c"}


def test_deterministic_input_order_and_diversity() -> None:
    candidates = [
        Candidate(f"a-{i}", f"Song {i}", ("A",), album="Album A") for i in range(10)
    ]
    candidates += [
        Candidate("b", "Different", ("B",), album="Album B"),
        Candidate("c", "Another", ("C",)),
    ]
    first = rank(candidates, limit=3)
    assert first == rank(list(reversed(candidates)), limit=3)
    assert {"b", "c"}.issubset(first)


def test_library_is_deprioritized_but_can_fill_a_small_catalog() -> None:
    assert rank([Candidate("a", "Saved", in_library=True), Candidate("z", "New")]) == [
        "z",
        "a",
    ]
    assert rank([Candidate("a", "Saved", in_library=True)]) == ["a"]


def test_naive_timestamps_future_dates_and_external_ranking() -> None:
    candidates = [
        Candidate("a", "A"),
        Candidate("z", "Match", ("Artist",)),
        Candidate(
            "future", "Future", last_played=NOW.replace(tzinfo=None) + timedelta(days=1)
        ),
    ]
    assert rank(candidates, external=[(" MATCH ", "ARTIST")])[0] == "z"
    assert "future" not in rank(candidates)


@pytest.fixture
def service(monkeypatch: pytest.MonkeyPatch) -> tuple[AsyncSession, list[Candidate]]:
    Recommendation.candidates.clear()
    Recommendation.shown.clear()
    candidates = [Candidate("a", "First", ("One",)), Candidate("b", "Second", ("Two",))]
    monkeypatch.setattr(
        RecommendationAccess,
        "candidates_async",
        AsyncMock(
            return_value=AResult(code=AResultCode.OK, message="OK", result=candidates)
        ),
    )
    monkeypatch.setattr(
        RecommendationAccess,
        "current_async",
        AsyncMock(return_value=AResult(code=AResultCode.OK, message="OK", result="")),
    )

    async def hydrate(
        session: AsyncSession, public_ids: list[str]
    ) -> list[BaseSongWithAlbumResponse]:
        mapping = {c.public_id: song(candidate=c) for c in candidates}
        return [mapping[pid] for pid in public_ids if pid in mapping]

    monkeypatch.setattr(Recommendation, "_songs_async", hydrate)
    return AsyncMock(spec=AsyncSession), candidates


async def test_local_requires_no_external_configuration(
    service: tuple[AsyncSession, list[Candidate]], monkeypatch: pytest.MonkeyPatch
) -> None:
    external = AsyncMock()
    monkeypatch.setattr(Recommendation, "external", external)
    result = await Recommendation.get_async(session=service[0], user_id=1)
    assert result.is_ok()
    assert result.result().songs
    assert result.result().provider == "local"
    external.recommendations_async.assert_not_awaited()


async def test_metadata_snapshot_is_cached_and_users_are_isolated(
    service: tuple[AsyncSession, list[Candidate]],
) -> None:
    first = await Recommendation.get_async(session=service[0], user_id=1, limit=1)
    second = await Recommendation.get_async(session=service[0], user_id=1, limit=1)
    assert first.is_ok() and second.is_ok()
    assert first.result().songs[0].publicId != second.result().songs[0].publicId
    RecommendationAccess.candidates_async.assert_awaited_once()  # type: ignore[attr-defined]
    await Recommendation.get_async(session=service[0], user_id=2)
    assert RecommendationAccess.candidates_async.await_count == 2  # type: ignore[attr-defined]


async def test_empty_catalog_skips_external(
    service: tuple[AsyncSession, list[Candidate]], monkeypatch: pytest.MonkeyPatch
) -> None:
    service[1].clear()
    external = AsyncMock()
    monkeypatch.setattr(Recommendation, "external", external)
    result = await Recommendation.get_async(
        session=service[0], user_id=1, external_username="tester"
    )
    assert result.is_ok() and result.result().songs == []
    external.recommendations_async.assert_not_awaited()


@pytest.mark.parametrize(
    "failure", [TimeoutError(), ConnectionError(), RuntimeError("private details")]
)
async def test_replaceable_provider_failures_preserve_local(
    service: tuple[AsyncSession, list[Candidate]],
    monkeypatch: pytest.MonkeyPatch,
    failure: Exception,
) -> None:
    external = AsyncMock()
    external.recommendations_async.side_effect = failure
    monkeypatch.setattr(Recommendation, "external", external)
    result = await Recommendation.get_async(
        session=service[0], user_id=1, external_username="tester"
    )
    assert result.is_ok()
    assert [s.publicId for s in result.result().songs] == ["a", "b"]
    assert result.result().provider == "local"
    assert "private" not in result.result().model_dump_json()


async def test_api_contract_validates_limits_and_requires_authentication(
    service: tuple[AsyncSession, list[Candidate]],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from types import SimpleNamespace
    import httpx
    from fastapi import FastAPI
    from backend.core.controllers.recommendationController import router
    from backend.core.middlewares.authMiddleware import AuthMiddleware
    from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware

    app = FastAPI()
    app.include_router(router)
    monkeypatch.setattr(
        AuthMiddleware,
        "get_current_user",
        Mock(
            return_value=AResult(
                code=AResultCode.OK, message="OK", result=SimpleNamespace(id=1)
            )
        ),
    )
    monkeypatch.setattr(
        DBSessionMiddleware, "get_session", Mock(return_value=service[0])
    )
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        assert (await client.post("/recommendations", json={})).status_code == 401
        app.dependency_overrides[AuthMiddleware.auth_dependency] = lambda: None
        response = await client.post("/recommendations", json={"limit": 1})
        assert response.status_code == 200
        assert len(response.json()["songs"]) == 1
        assert response.json()["songs"][0]["audioUrl"].startswith(
            "http://test/rockit/audio/"
        )
        for body in ({"limit": 0}, {"limit": 1000}, {"externalUsername": "x" * 65}):
            assert (await client.post("/recommendations", json=body)).status_code == 422
        monkeypatch.setattr(
            AuthMiddleware,
            "get_current_user",
            Mock(
                return_value=AResult(
                    code=AResultCode.NOT_FOUND, message="Not authenticated"
                )
            ),
        )
        assert (await client.post("/recommendations", json={})).status_code in (
            401,
            403,
            404,
        )


async def test_disabled_external_still_serves_local(
    service: tuple[AsyncSession, list[Candidate]],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from backend.core.framework.listenbrainzRecommendation import (
        ListenBrainzRecommendation,
    )

    monkeypatch.setattr(
        Recommendation, "external", ListenBrainzRecommendation(enabled=False)
    )
    result = await Recommendation.get_async(
        session=service[0], user_id=1, external_username="tester"
    )
    assert result.is_ok()
    assert result.result().externalStatus == "disabled"
    assert len(result.result().songs) == 2


@pytest.mark.parametrize(
    "package,class_name",
    [("spotify", "SpotifyProvider"), ("spotifyScrapper", "SpotifyScrapperProvider")],
)
async def test_spotify_hydration_uses_only_stored_rows(
    monkeypatch: pytest.MonkeyPatch,
    package: str,
    class_name: str,
) -> None:
    from importlib import import_module
    import httpx
    from backend.core.framework import providers
    from backend.core.framework.models.media import MediaModel
    from backend.core.framework.media.media import Media

    module = import_module(f"backend.{package}.framework.provider.{package}Provider")
    provider = getattr(module, class_name)()
    provider.set_info(provider_id=3, provider_name="Spotify")
    access_module = import_module(f"backend.{package}.access.{package}Access")
    access = getattr(
        access_module,
        "SpotifyAccess" if package == "spotify" else "SpotifyScrapperAccess",
    )
    converter = import_module(f"backend.{package}.utils.conversions")
    expected = song(candidate=Candidate("stored", "Stored", ("Artist",)))
    monkeypatch.setattr(providers, "find_media_provider", Mock(return_value=provider))
    monkeypatch.setattr(
        Media,
        "get_medias_from_public_ids_async",
        AsyncMock(
            return_value=AResult(
                code=AResultCode.OK,
                message="OK",
                result=[MediaModel(public_id="stored", id=10, provider_id=3)],
            )
        ),
    )
    monkeypatch.setattr(
        access,
        "get_tracks_spotify_id_from_public_ids_async",
        AsyncMock(
            return_value=AResult(
                code=AResultCode.OK, message="OK", result={"stored": "real-spotify-id"}
            )
        ),
    )
    monkeypatch.setattr(
        access,
        "get_tracks_by_spotify_ids_async",
        AsyncMock(
            return_value=AResult(code=AResultCode.OK, message="OK", result=[object()])
        ),
    )
    monkeypatch.setattr(
        converter,
        "get_tracks_responses_async",
        AsyncMock(
            return_value=AResult(code=AResultCode.OK, message="OK", result=[expected])
        ),
    )
    network = AsyncMock(side_effect=AssertionError("Must not call external music APIs"))
    monkeypatch.setattr(httpx.AsyncClient, "send", network)
    # A normal provider fetch is forbidden too: it can resolve misses online.
    monkeypatch.setattr(
        provider,
        "get_songs_async",
        AsyncMock(side_effect=AssertionError("Fetch-on-miss forbidden")),
    )
    Recommendation.candidates.clear()
    Recommendation.shown.clear()
    monkeypatch.setattr(
        RecommendationAccess,
        "candidates_async",
        AsyncMock(
            return_value=AResult(
                code=AResultCode.OK,
                message="OK",
                result=[Candidate("stored", "Stored", ("Artist",))],
            )
        ),
    )
    monkeypatch.setattr(
        RecommendationAccess,
        "current_async",
        AsyncMock(return_value=AResult(code=AResultCode.OK, message="OK", result="")),
    )
    result = await Recommendation.get_async(
        session=AsyncMock(spec=AsyncSession), user_id=1
    )
    assert result.is_ok()
    assert result.result().songs == [expected]
    network.assert_not_awaited()
