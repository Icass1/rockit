import asyncio
from collections.abc import Callable
from datetime import timezone
from email.utils import parsedate_to_datetime
import json
import math
from pathlib import Path
import time
from typing import Protocol
from urllib.parse import quote, urlparse
from uuid import UUID

import httpx
from cachetools import TTLCache
from filelock import FileLock
from pydantic import ValidationError

from backend.core.framework.models.recommendation import (
    ListenBrainzPlaylistListing,
    ListenBrainzPlaylistDocument,
    ListenBrainzTrack,
)

from backend.constants import (
    LISTENBRAINZ_ENABLED,
    LISTENBRAINZ_TIMEOUT_SECONDS,
    LISTENBRAINZ_CACHE_SECONDS,
    TEMP_PATH,
)
from backend.utils.logger import getLogger

logger = getLogger(__name__)


class ExternalRecommendationProvider(Protocol):
    async def recommendations_async(self, username: str) -> list[tuple[str, str]]:
        """Return ranked (title, artist credit) metadata, never playable URLs."""
        ...


def _delay(headers: httpx.Headers, now: float, limited: bool) -> float:
    """Respect both HTTP Retry-After forms and ListenBrainz's reset headers."""
    values = [60.0 if limited else 1.0]
    retry = headers.get("Retry-After")
    if retry:
        try:
            values.append(float(retry))
        except ValueError:
            try:
                date = parsedate_to_datetime(retry)
                if date.tzinfo is None:
                    date = date.replace(tzinfo=timezone.utc)
                values.append(date.timestamp() - now)
            except (TypeError, ValueError, OverflowError):
                pass
    if limited or headers.get("X-RateLimit-Remaining") == "0":
        for name in ("X-RateLimit-Reset-In", "X-RateLimit-Reset"):
            try:
                value = float(headers.get(name, ""))
                values.append(value - now if name == "X-RateLimit-Reset" else value)
            except ValueError:
                pass
    return max(v for v in values if math.isfinite(v))


class ListenBrainzRecommendation:
    """Public recommendation playlists; no token, history upload or MBID lookup.

    A shared file lock and next-request timestamp coordinate workers on one host.
    Lock contention falls back immediately. Multi-host replicas must share this
    directory or enable this provider on only one replica.
    """

    def __init__(
        self,
        enabled: bool = LISTENBRAINZ_ENABLED,
        timeout: float = LISTENBRAINZ_TIMEOUT_SECONDS,
        cache_seconds: int = LISTENBRAINZ_CACHE_SECONDS,
        directory: Path | None = None,
        client_factory: Callable[..., httpx.AsyncClient] = httpx.AsyncClient,
    ) -> None:
        self.enabled = enabled
        self.timeout = (
            timeout if math.isfinite(timeout) and 0.1 <= timeout <= 5 else 3.0
        )
        self.directory = directory or Path(TEMP_PATH) / "listenbrainz"
        self.client_factory = client_factory
        self.cache: TTLCache[str, list[tuple[str, str]]] = TTLCache[
            str, list[tuple[str, str]]
        ](maxsize=128, ttl=max(60, min(cache_seconds, 86400)))
        self.cooldown: TTLCache[str, bool] = TTLCache[str, bool](maxsize=512, ttl=60)

    async def _json_async(
        self, client: httpx.AsyncClient, path: str, state: Path
    ) -> object:
        """One size-bounded request, at least one second after the preceding one."""
        now = time.time()
        try:
            next_at = float(state.read_text()) if state.exists() else 0.0
        except ValueError:
            # A process killed during a write must not disable the provider forever.
            next_at = now + 1.0
        delay = next_at - now
        if delay > 1.05:
            return None
        if delay > 0:
            await asyncio.sleep(delay)
        # Reserve before sending, including connection errors and cancellations.
        state.write_text(str(time.time() + 1.0))
        async with client.stream("GET", path) as response:
            state.write_text(
                str(
                    time.time()
                    + _delay(
                        headers=response.headers,
                        now=time.time(),
                        limited=response.status_code == 429,
                    )
                )
            )
            if response.status_code != 200:
                return None
            body = bytearray()
            async for chunk in response.aiter_bytes(chunk_size=65536):
                body.extend(chunk)
                if len(body) > 1_048_576:
                    return None
            return json.loads(body)

    async def _fetch_async(self, username: str) -> list[tuple[str, str]]:
        self.directory.mkdir(parents=True, exist_ok=True)
        # Synchronous acquisition is non-blocking; release even on cancellation.
        lock = FileLock(str(self.directory / "requests.lock"))
        with lock.acquire(timeout=0):
            state = self.directory / "next-request"
            async with self.client_factory(
                base_url="https://api.listenbrainz.org",
                timeout=self.timeout,
                follow_redirects=False,
                headers={
                    "User-Agent": "Rockit/0.1 ( https://github.com/Icass1/rockit )",
                    "Accept": "application/json",
                },
            ) as client:
                listing = await self._json_async(
                    client=client,
                    path=f"/1/user/{quote(username, safe='')}/playlists/recommendations",
                    state=state,
                )
                playlists = ListenBrainzPlaylistListing.model_validate(
                    listing
                ).playlists[:25]
                playlists.sort(key=lambda p: p.playlist.date, reverse=True)
                if not playlists:
                    return []
                url = urlparse(playlists[0].playlist.identifier)
                if url.hostname != "listenbrainz.org" or not url.path.startswith(
                    "/playlist/"
                ):
                    return []
                playlist_id = str(UUID(url.path.rstrip("/").rsplit("/", 1)[-1]))
                data = await self._json_async(
                    client=client, path=f"/1/playlist/{playlist_id}", state=state
                )
                tracks = ListenBrainzPlaylistDocument.model_validate(
                    data
                ).playlist.track
                result: list[tuple[str, str]] = []
                for item in tracks[:200]:
                    try:
                        track = ListenBrainzTrack.model_validate(item)
                    except ValidationError:
                        continue
                    if track.title.strip() and track.creator.strip():
                        result.append((track.title.strip(), track.creator.strip()))
                return list(dict.fromkeys(result))

    async def recommendations_async(self, username: str) -> list[tuple[str, str]]:
        """Successful results expire; transient failures cool down, with no retries."""
        if (
            not self.enabled
            or not username
            or len(username) > 64
            or any(ord(c) < 32 for c in username)
        ):
            return []
        if username in self.cache:
            return self.cache[username]
        if username in self.cooldown:
            return []
        # Also coalesce concurrent requests for the same username.
        self.cooldown[username] = True
        try:
            result = await asyncio.wait_for(
                self._fetch_async(username=username), timeout=self.timeout
            )
            if result:
                self.cache[username] = result
            return result
        except Exception:
            # Deliberately omit exception text: URLs can contain personal identifiers.
            logger.warning(
                "ListenBrainz recommendations unavailable; using local recommendations"
            )
            return []
