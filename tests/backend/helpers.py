from typing import Callable

import httpx

from backend.core.framework.externalRecommendation.rateLimiter import RateLimiter


class FakeClock:
    """Deterministic monotonic clock whose sleep advances time instantly."""

    def __init__(self) -> None:
        self.now = 1000.0
        self.sleeps: list[float] = []

    def __call__(self) -> float:
        return self.now

    async def sleep(self, seconds: float) -> None:
        self.sleeps.append(seconds)
        self.now += seconds


def make_limiter(
    clock: FakeClock, min_interval: float = 1.0, max_wait: float = 2.5
) -> RateLimiter:
    return RateLimiter(
        min_interval_seconds=min_interval,
        max_wait_seconds=max_wait,
        clock=clock,
        sleep=clock.sleep,
    )


class RecordingTransport(httpx.AsyncBaseTransport):
    """Mock transport that records requests and answers via a handler."""

    def __init__(
        self,
        handler: Callable[[httpx.Request], httpx.Response],
        clock: FakeClock | None = None,
    ) -> None:
        self._handler = handler
        self._clock = clock
        self.requests: list[httpx.Request] = []
        self.request_times: list[float] = []

    async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        if self._clock is not None:
            self.request_times.append(self._clock.now)
        return self._handler(request)
