import json
import unittest
from typing import Callable

import httpx

import tests  # noqa: F401  # pyright: ignore[reportUnusedImport]  (test env setup)

from backend.core.aResult import AResultCode
from backend.core.framework.externalRecommendation.listenBrainzProvider import (
    LISTENBRAINZ_USER_AGENT,
    ListenBrainzProvider,
)
from backend.core.framework.models.recommendation import (
    ERecommendationContextKind,
    ExternalRecommendationContext,
    SeedTrack,
)
from tests.backend.helpers import FakeClock, RecordingTransport, make_limiter

BASE_URL = "https://lb.test"
MBID_1 = "526bd613-fddd-4bd6-9137-ab709ac74cab"
MBID_2 = "a6081bc1-2a76-4984-b21f-38bc3dcca3a5"
MBID_3 = "e97f805a-ab48-4c52-855e-07049142113d"

USER_CONTEXT = ExternalRecommendationContext(
    kind=ERecommendationContextKind.USER, listenbrainz_username="some user"
)


def cf_response(mbids: list[str]) -> httpx.Response:
    return httpx.Response(
        200,
        json={
            "payload": {
                "mbids": [
                    {"recording_mbid": m, "score": 10.0 - i}
                    for i, m in enumerate(mbids)
                ],
                "entity": "recording",
                "user_name": "some user",
                "count": len(mbids),
                "total_mbid_count": len(mbids),
                "offset": 0,
                "last_updated": 1588494361,
            }
        },
    )


def metadata_entry(name: str | None, artist: str | None) -> dict[str, object]:
    return {
        "recording": {"name": name} if name is not None else {},
        "artist": {"name": artist} if artist is not None else {},
        "release": {"name": "Some Album"},
    }


class ListenBrainzProviderTests(unittest.IsolatedAsyncioTestCase):
    def make_provider(
        self, handler: Callable[[httpx.Request], httpx.Response]
    ) -> tuple[ListenBrainzProvider, RecordingTransport, FakeClock]:
        clock = FakeClock()
        transport = RecordingTransport(handler, clock=clock)
        provider = ListenBrainzProvider(
            base_url=BASE_URL,
            timeout_seconds=1.0,
            limiter=make_limiter(clock),
            transport=transport,
        )
        return provider, transport, clock

    async def test_success_uses_two_batched_requests_one_second_apart(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            if request.method == "GET":
                return cf_response([MBID_1, MBID_2, MBID_3])
            body = json.loads(request.content)
            self.assertEqual(body["recording_mbids"], [MBID_1, MBID_2, MBID_3])
            self.assertEqual(body["inc"], "artist release")
            return httpx.Response(
                200,
                json={
                    MBID_1: metadata_entry("Roads", "Portishead"),
                    # Missing names: dropped, not guessed.
                    MBID_2: metadata_entry(None, "Nameless"),
                    # MBID_3 absent from metadata: dropped.
                },
            )

        provider, transport, _ = self.make_provider(handler)
        a_result = await provider.get_suggestions_async(USER_CONTEXT, limit=10)

        self.assertTrue(a_result.is_ok())
        suggestions = a_result.result()
        self.assertEqual(len(suggestions), 1)
        self.assertEqual(suggestions[0].track_name, "Roads")
        self.assertEqual(suggestions[0].artist_name, "Portishead")
        self.assertEqual(suggestions[0].recording_mbid, MBID_1)
        self.assertEqual(suggestions[0].album_name, "Some Album")

        self.assertEqual(len(transport.requests), 2)
        first, second = transport.requests
        # Username is path-encoded; nothing but the username is sent.
        self.assertTrue(
            first.url.raw_path.startswith(
                b"/1/cf/recommendation/user/some%20user/recording?"
            )
        )
        self.assertEqual(first.url.params["count"], "50")
        self.assertNotIn("authorization", {k.lower() for k in first.headers})
        self.assertEqual(first.headers["user-agent"], LISTENBRAINZ_USER_AGENT)
        self.assertEqual(second.url.path, "/1/metadata/recording/")
        # Documented limit: at most one request per second.
        self.assertGreaterEqual(
            transport.request_times[1] - transport.request_times[0], 1.0
        )

    async def test_no_content_means_empty_without_metadata_call(self) -> None:
        provider, transport, _ = self.make_provider(lambda _: httpx.Response(204))
        a_result = await provider.get_suggestions_async(USER_CONTEXT, limit=10)
        self.assertTrue(a_result.is_ok())
        self.assertEqual(a_result.result(), [])
        self.assertEqual(len(transport.requests), 1)

    async def test_empty_recommendation_list(self) -> None:
        provider, transport, _ = self.make_provider(lambda _: cf_response([]))
        a_result = await provider.get_suggestions_async(USER_CONTEXT, limit=10)
        self.assertTrue(a_result.is_ok())
        self.assertEqual(a_result.result(), [])
        self.assertEqual(len(transport.requests), 1)

    async def test_unknown_user_is_a_failure(self) -> None:
        provider, _, _ = self.make_provider(
            lambda _: httpx.Response(404, json={"error": "Cannot find user"})
        )
        a_result = await provider.get_suggestions_async(USER_CONTEXT, limit=10)
        self.assertTrue(a_result.is_not_ok())
        self.assertEqual(a_result.code(), AResultCode.NOT_FOUND)

    async def test_server_error_is_a_failure_and_not_retried(self) -> None:
        provider, transport, _ = self.make_provider(lambda _: httpx.Response(503))
        a_result = await provider.get_suggestions_async(USER_CONTEXT, limit=10)
        self.assertTrue(a_result.is_not_ok())
        self.assertEqual(len(transport.requests), 1)

    async def test_malformed_payloads_are_failures(self) -> None:
        bodies = [
            httpx.Response(200, content=b"not json"),
            httpx.Response(200, json=["unexpected"]),
            httpx.Response(200, json={"payload": {"mbids": "nope"}}),
            httpx.Response(200, json={}),
        ]
        for body in bodies:
            with self.subTest(body=body.content[:30]):
                provider, _, _ = self.make_provider(lambda _, b=body: b)
                a_result = await provider.get_suggestions_async(USER_CONTEXT, limit=5)
                self.assertTrue(a_result.is_not_ok())

    async def test_invalid_mbids_are_ignored(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            if request.method == "GET":
                return httpx.Response(
                    200,
                    json={
                        "payload": {
                            "mbids": [
                                {"recording_mbid": "not-a-uuid", "score": 1},
                                {"score": 3},
                                "garbage",
                                {"recording_mbid": MBID_1, "score": "high"},
                                {"recording_mbid": MBID_1.upper(), "score": 2},
                            ]
                        }
                    },
                )
            body = json.loads(request.content)
            self.assertEqual(body["recording_mbids"], [MBID_1])
            return httpx.Response(200, json={MBID_1: metadata_entry("A", "B")})

        provider, _, _ = self.make_provider(handler)
        a_result = await provider.get_suggestions_async(USER_CONTEXT, limit=5)
        self.assertTrue(a_result.is_ok())
        self.assertEqual([s.track_name for s in a_result.result()], ["A"])

    async def test_metadata_failure_fails_the_provider(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            if request.method == "GET":
                return cf_response([MBID_1])
            return httpx.Response(500)

        provider, _, _ = self.make_provider(handler)
        a_result = await provider.get_suggestions_async(USER_CONTEXT, limit=5)
        self.assertTrue(a_result.is_not_ok())

    async def test_timeout_is_a_failure(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            raise httpx.ReadTimeout("slow", request=request)

        provider, transport, _ = self.make_provider(handler)
        a_result = await provider.get_suggestions_async(USER_CONTEXT, limit=5)
        self.assertTrue(a_result.is_not_ok())
        self.assertIn("timed out", a_result.message())
        self.assertEqual(len(transport.requests), 1)

    async def test_connection_failure_is_a_failure(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            raise httpx.ConnectError("offline", request=request)

        provider, _, _ = self.make_provider(handler)
        a_result = await provider.get_suggestions_async(USER_CONTEXT, limit=5)
        self.assertTrue(a_result.is_not_ok())

    async def test_429_with_long_retry_after_fails_fast_and_blocks_requests(
        self,
    ) -> None:
        provider, transport, clock = self.make_provider(
            lambda _: httpx.Response(429, headers={"Retry-After": "60"})
        )
        a_result = await provider.get_suggestions_async(USER_CONTEXT, limit=5)
        self.assertEqual(a_result.code(), AResultCode.RATE_LIMITED)
        self.assertEqual(len(transport.requests), 1)

        # During the cooldown no request is sent at all.
        a_again = await provider.get_suggestions_async(USER_CONTEXT, limit=5)
        self.assertEqual(a_again.code(), AResultCode.RATE_LIMITED)
        self.assertEqual(len(transport.requests), 1)

        # After it expires requests flow again.
        clock.now += 61
        await provider.get_suggestions_async(USER_CONTEXT, limit=5)
        self.assertEqual(len(transport.requests), 2)

    async def test_429_with_short_reset_is_retried_once(self) -> None:
        responses = [
            httpx.Response(429, headers={"X-RateLimit-Reset-In": "1"}),
            httpx.Response(204),
        ]
        provider, transport, clock = self.make_provider(lambda _: responses.pop(0))
        a_result = await provider.get_suggestions_async(USER_CONTEXT, limit=5)
        self.assertTrue(a_result.is_ok())
        self.assertEqual(len(transport.requests), 2)
        self.assertGreaterEqual(sum(clock.sleeps), 1.0)

    async def test_429_is_retried_at_most_once(self) -> None:
        provider, transport, _ = self.make_provider(
            lambda _: httpx.Response(429, headers={"Retry-After": "1"})
        )
        a_result = await provider.get_suggestions_async(USER_CONTEXT, limit=5)
        self.assertEqual(a_result.code(), AResultCode.RATE_LIMITED)
        self.assertEqual(len(transport.requests), 2)

    async def test_exhausted_window_delays_the_next_request(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            if request.method == "GET":
                response = cf_response([MBID_1])
                response.headers["X-RateLimit-Remaining"] = "0"
                response.headers["X-RateLimit-Reset-In"] = "2"
                return response
            return httpx.Response(200, json={MBID_1: metadata_entry("A", "B")})

        provider, transport, _ = self.make_provider(handler)
        a_result = await provider.get_suggestions_async(USER_CONTEXT, limit=5)
        self.assertTrue(a_result.is_ok())
        self.assertGreaterEqual(
            transport.request_times[1] - transport.request_times[0], 2.0
        )

    def test_serves_only_user_contexts_with_a_valid_username(self) -> None:
        provider = ListenBrainzProvider(base_url=BASE_URL)
        self.assertTrue(provider.can_serve(USER_CONTEXT))
        for context in [
            ExternalRecommendationContext(kind=ERecommendationContextKind.USER),
            ExternalRecommendationContext(
                kind=ERecommendationContextKind.USER, listenbrainz_username="   "
            ),
            ExternalRecommendationContext(
                kind=ERecommendationContextKind.USER, listenbrainz_username="a/b"
            ),
            ExternalRecommendationContext(
                kind=ERecommendationContextKind.SEED,
                listenbrainz_username="user",
                seed=SeedTrack(artist_name="A", track_name="B"),
            ),
        ]:
            with self.subTest(context=context):
                self.assertFalse(provider.can_serve(context))

    def test_cache_key_is_case_insensitive_per_user(self) -> None:
        provider = ListenBrainzProvider(base_url=BASE_URL)
        upper = ExternalRecommendationContext(
            kind=ERecommendationContextKind.USER, listenbrainz_username=" Rob "
        )
        lower = ExternalRecommendationContext(
            kind=ERecommendationContextKind.USER, listenbrainz_username="rob"
        )
        self.assertEqual(provider.cache_key(upper), provider.cache_key(lower))

    def test_username_validation(self) -> None:
        self.assertTrue(ListenBrainzProvider.is_valid_username("rob"))
        self.assertTrue(ListenBrainzProvider.is_valid_username("some user_1"))
        self.assertFalse(ListenBrainzProvider.is_valid_username(""))
        self.assertFalse(ListenBrainzProvider.is_valid_username("a" * 65))
        self.assertFalse(ListenBrainzProvider.is_valid_username("../admin"))
        self.assertFalse(ListenBrainzProvider.is_valid_username("bad\nname"))


if __name__ == "__main__":
    unittest.main()
