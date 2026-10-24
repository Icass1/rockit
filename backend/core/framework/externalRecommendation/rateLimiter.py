import asyncio
import time
from typing import Awaitable, Callable, Mapping

# Cooldown applied after HTTP 429 when the server sends no usable header.
DEFAULT_RATE_LIMIT_COOLDOWN_SECONDS = 30.0
# Never honour a server-requested cooldown longer than this; a broken header
# must not disable a provider for hours.
MAX_RATE_LIMIT_COOLDOWN_SECONDS = 600.0


def _parse_seconds(value: str | None) -> float | None:
    if value is None:
        return None
    try:
        seconds = float(value.strip())
    except ValueError:
        # Retry-After may also be an HTTP date; treat that as "no hint".
        return None
    return seconds if seconds >= 0 else None


class RateLimiter:
    """Process-wide client-side throttle for one external API.

    Spaces requests at least `min_interval_seconds` apart and honours the
    server's rate-limit headers (Retry-After, X-RateLimit-Remaining,
    X-RateLimit-Reset-In). Callers never wait longer than
    `max_wait_seconds`: if a slot is further away than that, acquire
    returns False and the caller falls back instead of blocking.
    """

    def __init__(
        self,
        min_interval_seconds: float,
        max_wait_seconds: float,
        clock: Callable[[], float] = time.monotonic,
        sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
    ):
        self._min_interval = min_interval_seconds
        self._max_wait = max_wait_seconds
        self._clock = clock
        self._sleep = sleep
        self._next_allowed = 0.0
        self._blocked_until = 0.0
        self._lock = asyncio.Lock()

    def cooldown_remaining(self) -> float:
        """Seconds until the server-imposed block (if any) expires."""

        return max(0.0, self._blocked_until - self._clock())

    async def acquire_async(self) -> bool:
        """Wait for the next request slot. False means "rate limited, do not
        send": the wait would exceed max_wait_seconds."""

        async with self._lock:
            now = self._clock()
            wait = max(self._next_allowed, self._blocked_until) - now
            if wait > self._max_wait:
                return False
            if wait > 0:
                await self._sleep(wait)
            self._next_allowed = self._clock() + self._min_interval
            return True

    def update_from_response(
        self, status_code: int, headers: Mapping[str, str]
    ) -> None:
        """Record the server's view of our budget after each response."""

        now = self._clock()
        retry_after = _parse_seconds(headers.get("retry-after"))
        reset_in = _parse_seconds(headers.get("x-ratelimit-reset-in"))
        remaining = _parse_seconds(headers.get("x-ratelimit-remaining"))

        block: float | None = None
        if status_code == 429:
            block = next(
                (v for v in (retry_after, reset_in) if v is not None),
                DEFAULT_RATE_LIMIT_COOLDOWN_SECONDS,
            )
        elif remaining is not None and remaining <= 0 and reset_in is not None:
            # Budget exhausted for this window: pause until it resets.
            block = reset_in

        if block is not None:
            block = min(block, MAX_RATE_LIMIT_COOLDOWN_SECONDS)
            self._blocked_until = max(self._blocked_until, now + block)
