import asyncio
import unittest
from datetime import timedelta
from typing import Any
from unittest import mock

import tests  # noqa: F401  # pyright: ignore[reportUnusedImport]  (test env setup)

from backend.core.aResult import AResult, AResultCode
from backend.core.framework.externalRecommendation.baseExternalRecommendationProvider import (
    BaseExternalRecommendationProvider,
)
from backend.core.framework.externalRecommendation.externalRecommendations import (
    ExternalRecommendations,
)
from backend.core.framework.models.recommendation import (
    EExternalStatus,
    ERecommendationContextKind,
    ExternalRecommendationContext,
    ExternalSuggestion,
    SeedTrack,
)
from backend.core.framework.recommendationRanking import RecommendationRanking
from tests.backend.helpers import FakeClock

CACHE_ACCESS = (
    "backend.core.framework.externalRecommendation.externalRecommendations."
    "ExternalRecommendationCacheAccess"
)

CONTEXT = ExternalRecommendationContext(
    kind=ERecommendationContextKind.USER,
    listenbrainz_username="rob",
    seed=SeedTrack(artist_name="Seed", track_name="Song"),
)


class FakeProvider(BaseExternalRecommendationProvider):
    def __init__(
        self,
        key: str,
        result: AResult[list[ExternalSuggestion]] | None = None,
        delay: float = 0.0,
        raises: bool = False,
        configured: bool = True,
        serves: bool = True,
    ) -> None:
        self.key = key
        self.display_name = key.title()
        self._result = result
        self._delay = delay
        self._raises = raises
        self._configured = configured
        self._serves = serves
        self.calls = 0

    def is_configured(self) -> bool:
        return self._configured

    def can_serve(self, context: ExternalRecommendationContext) -> bool:
        return self._serves

    def cache_key(self, context: ExternalRecommendationContext) -> str:
        return f"{self.key}|test"

    async def get_suggestions_async(
        self, context: ExternalRecommendationContext, limit: int
    ) -> AResult[list[ExternalSuggestion]]:
        self.calls += 1
        if self._delay:
            await asyncio.sleep(self._delay)
        if self._raises:
            raise RuntimeError("provider bug")
        assert self._result is not None
        return self._result


def ok(*tracks: tuple[str, str]) -> AResult[list[ExternalSuggestion]]:
    return AResult(
        code=AResultCode.OK,
        message="OK",
        result=[ExternalSuggestion(artist_name=a, track_name=t) for a, t in tracks],
    )


def failure(code: int = AResultCode.GENERAL_ERROR) -> AResult[list[ExternalSuggestion]]:
    return AResult(code=code, message="boom")


class ExternalRecommendationsTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.cache: dict[str, list[dict[str, Any]]] = {}
        self.cache_age = timedelta(0)

        async def get_cached(
            session: Any, cache_key: str
        ) -> AResult[tuple[list[dict[str, Any]], timedelta]]:
            if cache_key not in self.cache:
                return AResult(code=AResultCode.NOT_FOUND, message="miss")
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=(self.cache[cache_key], self.cache_age),
            )

        async def set_cached(
            session: Any, cache_key: str, suggestions: list[dict[str, Any]]
        ) -> AResult[bool]:
            self.cache[cache_key] = suggestions
            return AResult(code=AResultCode.OK, message="OK", result=True)

        patcher = mock.patch(CACHE_ACCESS)
        self.cache_access = patcher.start()
        self.addCleanup(patcher.stop)
        self.cache_access.get_cached_async.side_effect = get_cached
        self.cache_access.set_cached_async.side_effect = set_cached
        self.clock = FakeClock()

    def orchestrator(
        self, *providers: BaseExternalRecommendationProvider, timeout: float = 1.0
    ) -> ExternalRecommendations:
        return ExternalRecommendations(
            providers=list(providers),
            cache_hours=24,
            timeout_seconds=timeout,
            clock=self.clock,
        )

    async def run_orchestrator(
        self, orchestrator: ExternalRecommendations, limit: int = 5
    ):
        return await orchestrator.get_suggestions_async(
            session=mock.MagicMock(),
            context=CONTEXT,
            limit=limit,
            exclude_keys={RecommendationRanking.suggestion_key("Seed", "Song")},
        )

    async def test_first_provider_success_wins(self) -> None:
        first = FakeProvider("first", ok(("A", "One")))
        second = FakeProvider("second", ok(("B", "Two")))
        result = await self.run_orchestrator(self.orchestrator(first, second))
        self.assertEqual(result.status, EExternalStatus.OK)
        self.assertEqual(result.provider_name, "First")
        self.assertEqual([s.track_name for s in result.suggestions], ["One"])
        self.assertEqual(second.calls, 0)

    async def test_every_failure_kind_falls_back_to_the_next_provider(self) -> None:
        failing_providers = {
            "http error": FakeProvider("bad", failure()),
            "rate limited": FakeProvider("bad", failure(AResultCode.RATE_LIMITED)),
            "not found": FakeProvider("bad", failure(AResultCode.NOT_FOUND)),
            "raises": FakeProvider("bad", raises=True),
            "timeout": FakeProvider("bad", ok(("X", "Late")), delay=5),
        }
        for name, bad in failing_providers.items():
            with self.subTest(failure=name):
                self.cache.clear()
                fallback = FakeProvider("fallback", ok(("B", "Two")))
                result = await self.run_orchestrator(
                    self.orchestrator(bad, fallback, timeout=0.05)
                )
                self.assertEqual(result.status, EExternalStatus.OK)
                self.assertEqual(result.provider_name, "Fallback")
                self.assertEqual(fallback.calls, 1)

    async def test_empty_or_unusable_answers_fall_back_too(self) -> None:
        empty = FakeProvider("empty", ok())
        only_seed = FakeProvider("seedonly", ok(("Seed", "Song"), ("", "x")))
        fallback = FakeProvider("fallback", ok(("B", "Two")))
        result = await self.run_orchestrator(
            self.orchestrator(empty, only_seed, fallback)
        )
        self.assertEqual(result.provider_name, "Fallback")

    async def test_all_failing_reports_unavailable(self) -> None:
        result = await self.run_orchestrator(
            self.orchestrator(
                FakeProvider("a", failure()), FakeProvider("b", failure())
            )
        )
        self.assertEqual(result.status, EExternalStatus.UNAVAILABLE)
        self.assertEqual(result.suggestions, [])

    async def test_answered_but_empty_reports_empty(self) -> None:
        result = await self.run_orchestrator(
            self.orchestrator(FakeProvider("a", failure()), FakeProvider("b", ok()))
        )
        self.assertEqual(result.status, EExternalStatus.EMPTY)

    async def test_no_eligible_provider_is_disabled_and_makes_no_calls(self) -> None:
        unconfigured = FakeProvider("a", ok(("A", "One")), configured=False)
        cannot_serve = FakeProvider("b", ok(("B", "Two")), serves=False)
        result = await self.run_orchestrator(
            self.orchestrator(unconfigured, cannot_serve)
        )
        self.assertEqual(result.status, EExternalStatus.DISABLED)
        self.assertEqual(unconfigured.calls + cannot_serve.calls, 0)
        result = await self.run_orchestrator(self.orchestrator())
        self.assertEqual(result.status, EExternalStatus.DISABLED)

    async def test_successful_answers_are_cached(self) -> None:
        provider = FakeProvider("a", ok(("A", "One")))
        orchestrator = self.orchestrator(provider)
        await self.run_orchestrator(orchestrator)
        result = await self.run_orchestrator(orchestrator)
        self.assertEqual(provider.calls, 1)
        self.assertEqual([s.track_name for s in result.suggestions], ["One"])

    async def test_stale_cache_is_refreshed(self) -> None:
        provider = FakeProvider("a", ok(("A", "One")))
        orchestrator = self.orchestrator(provider)
        await self.run_orchestrator(orchestrator)
        self.cache_age = timedelta(hours=25)
        await self.run_orchestrator(orchestrator)
        self.assertEqual(provider.calls, 2)

    async def test_empty_answers_expire_sooner(self) -> None:
        provider = FakeProvider("a", ok())
        orchestrator = self.orchestrator(provider)
        await self.run_orchestrator(orchestrator)
        self.cache_age = timedelta(minutes=30)
        await self.run_orchestrator(orchestrator)
        self.assertEqual(provider.calls, 1)
        self.cache_age = timedelta(hours=2)
        await self.run_orchestrator(orchestrator)
        self.assertEqual(provider.calls, 2)

    async def test_failures_are_never_cached_but_back_off_briefly(self) -> None:
        provider = FakeProvider("a", failure())
        orchestrator = self.orchestrator(provider)
        await self.run_orchestrator(orchestrator)
        self.assertEqual(self.cache, {})

        # Within the in-memory back-off window the provider is not hit again.
        await self.run_orchestrator(orchestrator)
        self.assertEqual(provider.calls, 1)

        # Afterwards it is retried.
        self.clock.now += 301
        await self.run_orchestrator(orchestrator)
        self.assertEqual(provider.calls, 2)

    async def test_cache_errors_do_not_break_suggestions(self) -> None:
        db_down: AResult[Any] = AResult(
            code=AResultCode.GENERAL_ERROR, message="db down"
        )
        self.cache_access.get_cached_async = mock.AsyncMock(return_value=db_down)
        self.cache_access.set_cached_async = mock.AsyncMock(return_value=db_down)
        result = await self.run_orchestrator(
            self.orchestrator(FakeProvider("a", ok(("A", "One"))))
        )
        self.assertEqual(result.status, EExternalStatus.OK)

    async def test_malformed_cache_rows_are_ignored(self) -> None:
        self.cache["a|test"] = [
            {"artist_name": "A", "track_name": "One", "score": "x"},
            {"artist_name": 5},
        ]
        provider = FakeProvider("a", ok(("B", "Fresh")))
        result = await self.run_orchestrator(self.orchestrator(provider))
        self.assertEqual([s.track_name for s in result.suggestions], ["One"])
        self.assertEqual(provider.calls, 0)

    def test_provider_order_comes_from_configuration(self) -> None:
        def keys(order: str) -> list[str]:
            return [p.key for p in ExternalRecommendations.from_config(order).providers]

        self.assertEqual(keys("lastfm, listenbrainz"), ["lastfm", "listenbrainz"])
        self.assertEqual(keys("none"), [])
        self.assertEqual(keys(""), [])
        self.assertEqual(keys("unknown,listenbrainz,LISTENBRAINZ"), ["listenbrainz"])


if __name__ == "__main__":
    unittest.main()
