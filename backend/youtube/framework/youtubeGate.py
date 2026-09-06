import asyncio
import random
import time

from backend.constants import YOUTUBE_BLOCK_THRESHOLD
from backend.constants import YOUTUBE_COOLDOWN_SECONDS
from backend.constants import YOUTUBE_MIN_REQUEST_INTERVAL_SECONDS
from backend.constants import YTDLP_PROXIES

from backend.utils.logger import getLogger

logger = getLogger(__name__)

# Every consecutive block widens the spacing between requests. Capped so the
# queue keeps moving even during a bad spell.
_MAX_BACKPRESSURE_MULTIPLIER: float = 8.0

# Jitter added on top of the computed interval, as a fraction of it. Perfectly
# regular spacing is itself a scraper signature.
_JITTER_RATIO: float = 0.5


class YoutubeGate:
    """Process-wide pacing, circuit breaking and proxy rotation for YouTube.

    Every yt-dlp extraction in the backend passes through a single instance of
    this class, so the whole process behaves like one well-mannered client
    instead of N independent ones racing each other into a 429.
    """

    _lock: asyncio.Lock
    _last_request_at: float
    _consecutive_blocks: int
    _open_until: float
    _proxy_index: int

    def __init__(self) -> None:
        """Create the gate with a clean history."""

        self._lock = asyncio.Lock()
        self._last_request_at = 0.0
        self._consecutive_blocks = 0
        self._open_until = 0.0
        self._proxy_index = 0

    def cooldown_remaining(self) -> float:
        """Seconds left before YouTube requests are allowed again, 0 when open for business."""

        remaining: float = self._open_until - time.monotonic()
        return remaining if remaining > 0 else 0.0

    def _current_interval(self) -> float:
        """Minimum spacing between requests, widened by recent blocks."""

        multiplier: float = min(
            float(2**self._consecutive_blocks), _MAX_BACKPRESSURE_MULTIPLIER
        )
        return YOUTUBE_MIN_REQUEST_INTERVAL_SECONDS * multiplier

    async def pace_async(self) -> None:
        """Wait until this process is allowed to hit YouTube again."""

        async with self._lock:
            interval: float = self._current_interval()
            jitter: float = random.uniform(0.0, interval * _JITTER_RATIO)
            target: float = self._last_request_at + interval + jitter
            wait_for: float = target - time.monotonic()

            if wait_for > 0:
                logger.debug(f"Pacing YouTube request, sleeping {wait_for:.1f}s")
                await asyncio.sleep(wait_for)

            self._last_request_at = time.monotonic()

    def record_success(self) -> None:
        """Reset the block streak after a successful extraction."""

        if self._consecutive_blocks > 0:
            logger.info(
                f"YouTube request succeeded, clearing block streak of "
                f"{self._consecutive_blocks}"
            )
        self._consecutive_blocks = 0
        self._open_until = 0.0

    def record_block(self) -> None:
        """Record one fully blocked download and trip the breaker on a long streak.

        Called once per download, not once per strategy attempt: exhausting the
        ladder on a single gated video is normal, and counting each rung would
        let one song open the circuit on its own.
        """

        self._consecutive_blocks += 1
        logger.warning(
            f"Download fully blocked: every candidate and strategy was refused "
            f"({self._consecutive_blocks}/{YOUTUBE_BLOCK_THRESHOLD} before cooldown)"
        )

        if self._consecutive_blocks >= YOUTUBE_BLOCK_THRESHOLD:
            self._open_until = time.monotonic() + YOUTUBE_COOLDOWN_SECONDS
            logger.error(
                f"YouTube looks rate limited. Pausing all downloads for "
                f"{YOUTUBE_COOLDOWN_SECONDS:.0f}s"
            )

    def next_proxy(self) -> str | None:
        """Return the next configured proxy, rotating round-robin. None when unconfigured."""

        if not YTDLP_PROXIES:
            return None

        proxy: str = YTDLP_PROXIES[self._proxy_index % len(YTDLP_PROXIES)]
        self._proxy_index += 1
        return proxy

    def has_proxies(self) -> bool:
        """Whether any proxy is configured."""

        return len(YTDLP_PROXIES) > 0


youtube_gate: YoutubeGate = YoutubeGate()
