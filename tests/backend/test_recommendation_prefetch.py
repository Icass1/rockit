import unittest
from typing import TypeVar
from unittest.mock import AsyncMock, MagicMock, patch

import tests  # noqa: F401  # pyright: ignore[reportUnusedImport]
from pydantic import ValidationError

from backend.core.responses.songListResponse import SongListResponse
from backend.core.aResult import AResult, AResultCode
from backend.core.framework.recommendationPrefetch import RecommendationPrefetch
from backend.core.framework.models.recommendation import SeedTrack
from backend.core.requests.prepareRecommendationsRequest import (
    PrepareRecommendationsRequest,
    RecommendationTrackRequest,
)
from tests.backend.test_recommendation_framework import make_song

T = TypeVar("T")


def ok(value: T) -> AResult[T]:
    return AResult(code=AResultCode.OK, message="OK", result=value)


class PrefetchTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.song = make_song("next")
        self.session = MagicMock()
        self.patches = [
            patch(
                "backend.core.framework.recommendationPrefetch.Media.resolve_songs_from_public_ids_async",
                AsyncMock(return_value=[self.song]),
            ),
            patch(
                "backend.core.framework.recommendationPrefetch.RecommendationPrefetch.admit_async",
                AsyncMock(return_value=ok(True)),
            ),
            patch(
                "backend.core.framework.recommendationPrefetch.Downloader.download_multiple_medias_async",
                AsyncMock(return_value=ok(True)),
            ),
            patch(
                "backend.core.framework.recommendationPrefetch.Downloader.resolve_search_song_async",
                AsyncMock(
                    return_value=AResult(code=AResultCode.NOT_FOUND, message="No match")
                ),
            ),
        ]
        cache_patch = patch.object(RecommendationPrefetch, "_failed_until", {})
        cache_patch.start()
        self.addCleanup(cache_patch.stop)
        self.resolve, self.admit, self.download, self.search = [
            p.start() for p in self.patches
        ]
        for p in self.patches:
            self.addCleanup(p.stop)

    async def prepare(
        self, payload: PrepareRecommendationsRequest | None = None
    ) -> AResult[SongListResponse]:
        payload = payload or PrepareRecommendationsRequest(publicIds=["next"])
        return await RecommendationPrefetch.prepare_async(
            session=self.session,
            user_id=1,
            public_ids=payload.publicIds,
            discover=[
                SeedTrack(artist_name=item.artist, track_name=item.track)
                for item in payload.discover
            ],
        )

    async def test_ready_files_never_consume_download_budget(self) -> None:
        result = await self.prepare()
        self.assertTrue(result.is_ok())
        self.admit.assert_not_awaited()
        self.download.assert_not_awaited()

    async def test_missing_song_uses_existing_downloader(self) -> None:
        self.song.downloaded = False
        await self.prepare()
        self.download.assert_awaited_once_with(
            session=self.session, user_id=1, title="Autoplay", public_ids=["next"]
        )

    async def test_busy_or_duplicate_never_starts_download(self) -> None:
        self.song.downloaded = False
        self.admit.return_value = ok(False)
        await self.prepare()
        self.download.assert_not_awaited()

    async def test_database_failure_keeps_existing_recommendations(self) -> None:
        self.song.downloaded = False
        self.admit.return_value = AResult(
            code=AResultCode.GENERAL_ERROR, message="offline"
        )
        result = await self.prepare()
        self.assertTrue(result.is_ok())
        self.assertEqual(result.result().songs[0].publicId, "next")
        self.download.assert_not_awaited()

    async def test_discovery_prepares_without_user_settings(self) -> None:
        await self.prepare(
            PrepareRecommendationsRequest(
                discover=[RecommendationTrackRequest(artist="Artist", track="Song")]
            )
        )
        self.search.assert_awaited_once()

    async def test_full_global_budget_does_not_even_search_providers(self) -> None:
        self.admit.return_value = ok(False)
        await self.prepare(
            PrepareRecommendationsRequest(
                discover=[RecommendationTrackRequest(artist="Artist", track="Song")]
            )
        )
        self.search.assert_not_awaited()

    def test_client_cannot_submit_unbounded_batches(self) -> None:
        with self.assertRaises(ValidationError):
            PrepareRecommendationsRequest(publicIds=["a", "b", "c"])


class DiscoveryMatchingTests(unittest.IsolatedAsyncioTestCase):
    async def test_uses_matching_artist_and_title_instead_of_first_search_hit(
        self,
    ) -> None:
        from backend.core.framework.downloader.downloader import Downloader
        from backend.core.responses.searchResponse import (
            BaseSearchResultsItem,
            ArtistSearchResultsItem,
            SearchResultsResponse,
        )

        def item(artist: str, name: str) -> BaseSearchResultsItem:
            return BaseSearchResultsItem(
                type="song",
                name=name,
                artists=[ArtistSearchResultsItem(name=artist, url="")],
                provider="Test",
                providerUrl="https://example.com/song",
                imageUrl="",
                downloaded=False,
                url=None,
            )

        wrong = item("Unrelated artist", "Unrelated song")
        match = item("The Beatles", "Here Comes the Sun (2019 Remaster)")
        with patch(
            "backend.core.framework.downloader.downloader.Media.search_async",
            AsyncMock(return_value=ok(SearchResultsResponse(results=[wrong, match]))),
        ):
            found = await Downloader.resolve_search_song_async(
                session=MagicMock(),
                artist_name="The Beatles",
                track_name="Here Comes the Sun",
            )
        self.assertTrue(found.is_ok())
        self.assertEqual(found.result().name, match.name)

    async def test_unrelated_results_are_not_automatically_downloaded(self) -> None:
        from backend.core.framework.downloader.downloader import Downloader
        from backend.core.responses.searchResponse import SearchResultsResponse

        with patch(
            "backend.core.framework.downloader.downloader.Media.search_async",
            AsyncMock(return_value=ok(SearchResultsResponse(results=[]))),
        ):
            found = await Downloader.resolve_search_song_async(
                session=MagicMock(), artist_name="Artist", track_name="Song"
            )
        self.assertTrue(found.is_not_ok())
