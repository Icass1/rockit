"""Behaviour of the Recommendation framework with the database layer mocked.

These tests check the contract that matters to users: local
recommendations are always served, and external providers only ever add to
them — whatever goes wrong externally.
"""

import unittest
from typing import Any
from unittest import mock

import tests  # noqa: F401  # pyright: ignore[reportUnusedImport]  (test env setup)

from backend.core.aResult import AResult, AResultCode
from backend.core.framework import recommendation as recommendation_module
from backend.core.framework.externalRecommendation.externalRecommendations import (
    ExternalRecommendations,
)
from backend.core.framework.models.media import MediaModel
from backend.core.framework.models.recommendation import (
    EExternalStatus,
    LocalCandidate,
    SeedTrack,
)
from backend.core.framework.recommendation import Recommendation
from backend.core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)
from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.searchResponse import BaseSearchResultsItem
from backend.core.responses.songListResponse import SongListResponse
from tests.backend.test_external_recommendations import FakeProvider, failure, ok

MODULE = "backend.core.framework.recommendation"
CACHE_ACCESS = (
    "backend.core.framework.externalRecommendation.externalRecommendations."
    "ExternalRecommendationCacheAccess"
)


def make_song(public_id: str, artist: str = "Artist") -> BaseSongWithAlbumResponse:
    artist_response = BaseArtistResponse(
        provider="Spotify",
        publicId=f"artist-{artist}",
        url="",
        providerUrl="",
        name=artist,
        imageUrl="",
        dominantColor="",
    )
    return BaseSongWithAlbumResponse(
        provider="Spotify",
        publicId=public_id,
        providerUrl="",
        name=f"Song {public_id}",
        artists=[artist_response],
        audioUrl=None,
        downloaded=True,
        imageUrl="",
        dominantColor="",
        duration_ms=1000,
        discNumber=1,
        trackNumber=1,
        album=BaseAlbumWithoutSongsResponse(
            provider="Spotify",
            publicId="album",
            url="",
            providerUrl="",
            name="Album",
            artists=[artist_response],
            releaseDate="2020",
            imageUrl="",
            dominantColor="",
        ),
    )


def ok_result(value: Any) -> AResult[Any]:
    return AResult(code=AResultCode.OK, message="OK", result=value)


class RecommendationFrameworkTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        recommendation_module._local_result_cache.clear()  # pyright: ignore[reportPrivateUsage]

        # --- user history -------------------------------------------------
        self.recent: list[str] = ["seed-1"]
        self.liked: list[str] = []
        self.external_enabled = True
        self.candidates: list[LocalCandidate] = [
            LocalCandidate(
                media_id=10, public_id="rec-1", artist_key="a", playlist_co=3
            ),
            LocalCandidate(
                media_id=11, public_id="rec-2", artist_key="b", session_co=2
            ),
        ]
        self.fallback: list[LocalCandidate] = [
            LocalCandidate(
                media_id=20, public_id="popular-1", artist_key="c", play_count=9
            ),
        ]
        self.in_library: dict[int, str] = {}

        async def recently_played(
            session: Any, user_id: int, limit: int
        ) -> AResult[list[str]]:
            return ok_result(list(self.recent))

        async def liked(session: Any, user_id: int) -> AResult[list[str]]:
            return ok_result(list(self.liked))

        async def medias(
            session: Any, public_ids: list[str], media_type_keys: Any
        ) -> AResult[list[MediaModel]]:
            return ok_result(
                [
                    MediaModel(public_id=pid, id=1000 + i, provider_id=1)
                    for i, pid in enumerate(public_ids)
                ]
            )

        async def resolve(session: Any, public_ids: list[str]):
            return [make_song(pid) for pid in public_ids]

        async def candidates(session: Any, **kwargs: Any):
            self.candidate_calls += 1
            return ok_result(list(self.candidates))

        async def fallback(session: Any, **kwargs: Any):
            return ok_result(list(self.fallback))

        async def in_library(session: Any, artists_and_tracks: Any):
            return ok_result(dict(self.in_library))

        async def settings(session: Any, user_id: int) -> AResult[Any]:
            if not self.external_enabled:
                return AResult(code=AResultCode.NOT_FOUND, message="none")
            row = mock.MagicMock(external_enabled=True, listenbrainz_username="rob")
            return ok_result(row)

        async def seed_track(session: Any, public_id: str) -> SeedTrack | None:
            return SeedTrack(artist_name="Seed Artist", track_name="Seed Song")

        self.candidate_calls = 0
        patches = [
            mock.patch(
                f"{MODULE}.StatsAccess.get_recently_played_songs_async", recently_played
            ),
            mock.patch(
                f"{MODULE}.UserLikedMediaAccess.get_user_liked_media_public_ids_async",
                liked,
            ),
            mock.patch(f"{MODULE}.Media.get_medias_from_public_ids_async", medias),
            mock.patch(f"{MODULE}.Media.resolve_songs_from_public_ids_async", resolve),
            mock.patch(
                f"{MODULE}.RecommendationAccess.get_local_candidates_async", candidates
            ),
            mock.patch(
                f"{MODULE}.RecommendationAccess.get_fallback_candidates_async", fallback
            ),
            mock.patch(
                f"{MODULE}.RecommendationAccess."
                "get_downloaded_discover_song_public_ids_async",
                in_library,
            ),
            mock.patch(
                f"{MODULE}.UserRecommendationSettingsAccess.get_settings_async",
                settings,
            ),
            mock.patch.object(Recommendation, "_resolve_seed_track_async", seed_track),
        ]
        for patcher in patches:
            patcher.start()
            self.addCleanup(patcher.stop)

        cache_patcher = mock.patch(CACHE_ACCESS)
        cache = cache_patcher.start()
        self.addCleanup(cache_patcher.stop)
        cache.get_cached_async = mock.AsyncMock(
            return_value=AResult(code=AResultCode.NOT_FOUND, message="miss")
        )
        cache.set_cached_async = mock.AsyncMock(return_value=ok_result(True))

    def use_providers(self, *providers: FakeProvider) -> None:
        patcher = mock.patch.object(
            Recommendation,
            "external",
            ExternalRecommendations(providers=list(providers), timeout_seconds=0.05),
        )
        patcher.start()
        self.addCleanup(patcher.stop)

    async def for_you(self, limit: int = 5):
        a_result = await Recommendation.get_recommendations_for_user_async(
            session=mock.MagicMock(), user_id=1, limit=limit
        )
        self.assertTrue(a_result.is_ok(), a_result.message())
        return a_result.result()

    async def test_personalized_results_come_first_then_fallback(self) -> None:
        self.use_providers()
        result = await self.for_you(limit=5)
        self.assertEqual(
            [s.publicId for s in result.songs], ["rec-1", "rec-2", "popular-1"]
        )
        self.assertEqual(result.discover_status, EExternalStatus.DISABLED)

    async def test_new_user_without_history_gets_fallback(self) -> None:
        self.use_providers()
        self.recent = []
        self.candidates = []
        result = await self.for_you()
        self.assertEqual([s.publicId for s in result.songs], ["popular-1"])

    async def test_empty_library_returns_empty_lists(self) -> None:
        self.use_providers()
        self.recent = []
        self.candidates = []
        self.fallback = []
        result = await self.for_you()
        self.assertEqual(result.songs, [])
        self.assertEqual(result.discover, [])

    async def test_already_played_songs_are_never_recommended(self) -> None:
        self.use_providers()
        self.recent = ["seed-1", "rec-1"]
        result = await self.for_you()
        self.assertNotIn("rec-1", [s.publicId for s in result.songs])
        self.assertNotIn("seed-1", [s.publicId for s in result.songs])

    async def test_local_results_are_cached_briefly(self) -> None:
        self.use_providers()
        await self.for_you()
        await self.for_you()
        self.assertEqual(self.candidate_calls, 1)

    async def test_external_failures_keep_local_results(self) -> None:
        local_only = ["rec-1", "rec-2", "popular-1"]
        for name, provider in {
            "http error": FakeProvider("lb", failure()),
            "rate limited": FakeProvider("lb", failure(AResultCode.RATE_LIMITED)),
            "raises": FakeProvider("lb", raises=True),
            "timeout": FakeProvider("lb", ok(("X", "Late")), delay=5),
            "empty": FakeProvider("lb", ok()),
        }.items():
            with self.subTest(failure=name):
                recommendation_module._local_result_cache.clear()  # pyright: ignore[reportPrivateUsage]
                self.use_providers(provider)
                result = await self.for_you()
                self.assertEqual([s.publicId for s in result.songs], local_only)
                self.assertEqual(result.discover, [])
                self.assertIn(
                    result.discover_status,
                    {EExternalStatus.UNAVAILABLE, EExternalStatus.EMPTY},
                )

    async def test_external_disabled_when_user_did_not_opt_in(self) -> None:
        provider = FakeProvider("lb", ok(("A", "One")))
        self.use_providers(provider)
        self.external_enabled = False
        result = await self.for_you()
        self.assertEqual(result.discover_status, EExternalStatus.DISABLED)
        self.assertEqual(provider.calls, 0)
        self.assertEqual(len(result.songs), 3)

    async def test_external_suggestions_are_actionable_and_deduplicated(self) -> None:
        self.use_providers(
            FakeProvider(
                "lb",
                ok(
                    ("Seed Artist", "Seed Song"),  # the seed itself: dropped
                    ("New Artist", "New Song"),  # not here yet: downloadable
                    ("Known", "Known Song"),  # in library, not played: playable
                    ("Played", "Played Song"),  # in library but played: dropped
                ),
            )
        )
        # Library matches use the SQL's 1-based ordinality over the ranked
        # suggestions (seed already removed): 2 -> Known, 3 -> Played.
        self.in_library = {2: "known-id", 3: "seed-1"}

        result = await self.for_you()

        self.assertEqual(result.discover_status, EExternalStatus.OK)
        self.assertEqual(result.discover_provider, "Lb")
        self.assertEqual(
            [(d.name, d.publicId, d.downloaded) for d in result.discover],
            [("New Song", None, False), ("Known Song", "known-id", True)],
        )
        for item in result.discover:
            # Never invent URLs: the download flow uses artist + track name.
            self.assertEqual(item.providerUrl, "")
            self.assertIsNone(item.url)
            self.assertTrue(item.artists[0].name)
        self.assertEqual(len(result.songs), 3)

    async def test_response_contract(self) -> None:
        self.use_providers(FakeProvider("lb", ok(("New Artist", "New Song"))))
        result = await self.for_you()
        response = Recommendation.to_song_list_response(result=result)
        self.assertIsInstance(response, SongListResponse)
        dumped = response.model_dump()
        self.assertEqual(dumped["discoverStatus"], "ok")
        self.assertEqual(dumped["discoverProvider"], "Lb")
        # Discover items keep the shape the existing download flow consumes.
        BaseSearchResultsItem.model_validate(dumped["discover"][0])

    async def test_legacy_clients_still_parse_the_response(self) -> None:
        # Older clients only know songs/discover; the new fields default.
        response = SongListResponse(songs=[make_song("a")])
        self.assertEqual(response.discoverStatus, "disabled")
        self.assertIsNone(response.discoverProvider)

    async def test_limit_is_bounded(self) -> None:
        self.assertEqual(Recommendation.clamp_limit(0), 1)
        self.assertEqual(Recommendation.clamp_limit(10_000), 50)

    async def test_reading_recommendations_never_starts_downloads(self):
        self.use_providers()
        with mock.patch(
            "backend.core.framework.downloader.downloader.Downloader.download_multiple_medias_async"
        ) as download:
            await self.for_you()
            download.assert_not_called()

    async def test_local_only_request_does_not_wait_for_external_provider(self):
        provider = FakeProvider("slow")
        self.use_providers(provider)
        with mock.patch.object(
            Recommendation.external, "get_suggestions_async"
        ) as external:
            result = await Recommendation.get_recommendations_for_user_async(
                session=mock.MagicMock(), user_id=1, include_external=False
            )
            self.assertTrue(result.is_ok())
            self.assertGreater(len(result.result().songs), 0)
            external.assert_not_called()


if __name__ == "__main__":
    unittest.main()
