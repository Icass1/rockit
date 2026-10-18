import unittest
from typing import Callable

import httpx

import tests  # noqa: F401  # pyright: ignore[reportUnusedImport]  (test env setup)

from backend.core.aResult import AResultCode
from backend.core.framework.externalRecommendation.lastfmProvider import (
    LastfmProvider,
)
from backend.core.framework.models.recommendation import (
    ERecommendationContextKind,
    ExternalRecommendationContext,
    SeedTrack,
)
from tests.backend.helpers import FakeClock, RecordingTransport, make_limiter

SEED_CONTEXT = ExternalRecommendationContext(
    kind=ERecommendationContextKind.SEED,
    seed=SeedTrack(artist_name="Portishead", track_name="Roads"),
)


class LastfmProviderTests(unittest.IsolatedAsyncioTestCase):
    def make_provider(
        self,
        handler: Callable[[httpx.Request], httpx.Response],
        api_key: str = "secret-key",
    ) -> tuple[LastfmProvider, RecordingTransport]:
        clock = FakeClock()
        transport = RecordingTransport(handler, clock=clock)
        provider = LastfmProvider(
            api_key=api_key,
            timeout_seconds=1.0,
            limiter=make_limiter(clock, min_interval=0.25),
            transport=transport,
        )
        return provider, transport

    async def test_success_parses_similar_tracks(self) -> None:
        provider, transport = self.make_provider(
            lambda _: httpx.Response(
                200,
                json={
                    "similartracks": {
                        "track": [
                            {
                                "name": "Glory Box",
                                "artist": {"name": "Portishead"},
                                "match": "0.9",
                                "mbid": "",
                            },
                            {"name": "Teardrop", "artist": {"name": "Massive Attack"}},
                            {"name": "", "artist": {"name": "Nobody"}},
                            {"name": "No artist"},
                            "garbage",
                        ]
                    }
                },
            )
        )
        a_result = await provider.get_suggestions_async(SEED_CONTEXT, limit=10)
        self.assertTrue(a_result.is_ok())
        self.assertEqual(
            [(s.artist_name, s.track_name) for s in a_result.result()],
            [("Portishead", "Glory Box"), ("Massive Attack", "Teardrop")],
        )
        self.assertAlmostEqual(a_result.result()[0].score, 0.9)
        self.assertIsNone(a_result.result()[0].recording_mbid)
        self.assertEqual(transport.requests[0].url.params["method"], "track.getsimilar")

    async def test_unknown_track_is_an_empty_answer(self) -> None:
        provider, _ = self.make_provider(
            lambda _: httpx.Response(200, json={"error": 6, "message": "not found"})
        )
        a_result = await provider.get_suggestions_async(SEED_CONTEXT, limit=10)
        self.assertTrue(a_result.is_ok())
        self.assertEqual(a_result.result(), [])

    async def test_rate_limit_error_code_is_a_failure(self) -> None:
        provider, transport = self.make_provider(
            lambda _: httpx.Response(200, json={"error": 29, "message": "slow down"})
        )
        a_result = await provider.get_suggestions_async(SEED_CONTEXT, limit=10)
        self.assertEqual(a_result.code(), AResultCode.RATE_LIMITED)
        # And the provider backs off instead of sending again right away.
        await provider.get_suggestions_async(SEED_CONTEXT, limit=10)
        self.assertEqual(len(transport.requests), 1)

    async def test_http_and_payload_errors_are_failures(self) -> None:
        for response in [
            httpx.Response(500),
            httpx.Response(200, content=b"<html>"),
            httpx.Response(200, json={"similartracks": {"track": "x"}}),
            httpx.Response(403, json={"error": 10, "message": "Invalid API key"}),
        ]:
            with self.subTest(status=response.status_code, body=response.content[:20]):
                provider, _ = self.make_provider(lambda _, r=response: r)
                a_result = await provider.get_suggestions_async(SEED_CONTEXT, limit=5)
                self.assertTrue(a_result.is_not_ok())

    async def test_api_key_never_appears_in_error_messages(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            raise httpx.ConnectError(f"failed {request.url}", request=request)

        provider, _ = self.make_provider(handler)
        a_result = await provider.get_suggestions_async(SEED_CONTEXT, limit=5)
        self.assertTrue(a_result.is_not_ok())
        self.assertNotIn("secret-key", a_result.message())

    def test_requires_api_key_and_seed(self) -> None:
        self.assertFalse(LastfmProvider(api_key="").is_configured())
        self.assertTrue(LastfmProvider(api_key="k").is_configured())
        provider = LastfmProvider(api_key="k")
        self.assertTrue(provider.can_serve(SEED_CONTEXT))
        self.assertFalse(
            provider.can_serve(
                ExternalRecommendationContext(kind=ERecommendationContextKind.USER)
            )
        )
        self.assertFalse(
            provider.can_serve(
                ExternalRecommendationContext(
                    kind=ERecommendationContextKind.SEED,
                    seed=SeedTrack(artist_name=" ", track_name="Roads"),
                )
            )
        )


if __name__ == "__main__":
    unittest.main()
