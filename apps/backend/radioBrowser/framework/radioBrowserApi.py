from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from logging import Logger
from typing import Any
from urllib.parse import quote

import httpx

from core.utils.timeIt import time_it
from logger import getLogger
from radioBrowser.responses.radioBrowserStation import (
    RadioBrowserStationResponse,
)
from result import Result, ResultCode

logger: Logger = getLogger(__name__)

RADIO_BROWSER_BASE = "https://de1.api.radio-browser.info/json"
RADIO_BROWSER_SERVERS = (RADIO_BROWSER_BASE, "https://de2.api.radio-browser.info/json")
SERVER_COOLDOWN_SECONDS = 30.0
SEARCH_LIMIT = 25
COUNTRY_LIMIT = 100
USER_AGENT = "RockIt/1.0 (self-hosted music player)"
REQUESTS_PER_SECOND = 2


class RateLimiter:
    """Simple rate limiter — ensures at most N requests per second."""

    def __init__(self, rate: int = REQUESTS_PER_SECOND) -> None:
        self.interval: float = 1.0 / rate
        self._last_call: float = 0.0
        self._lock = asyncio.Lock()

    async def wait(self) -> None:
        async with self._lock:
            loop = asyncio.get_running_loop()
            elapsed = loop.time() - self._last_call
            if elapsed < self.interval:
                await asyncio.sleep(self.interval - elapsed)
            self._last_call = loop.time()


_limiter = RateLimiter()


class RadioBrowserApi:
    """API client for the Radio Browser API (radio-browser.info)."""

    _preferred_server: str = RADIO_BROWSER_BASE
    _unavailable_until: dict[str, float] = {}

    @staticmethod
    async def _request(
        url: str, params: dict[str, Any] | None = None
    ) -> Result[list[dict[str, Any]]]:
        """Make an HTTP GET request with rate limiting and User-Agent."""

        headers: dict[str, str] = {"User-Agent": USER_AGENT}
        path = url.removeprefix(RADIO_BROWSER_BASE)
        servers = sorted(
            RADIO_BROWSER_SERVERS,
            key=lambda server: server != RadioBrowserApi._preferred_server,
        )
        loop = asyncio.get_running_loop()
        async with httpx.AsyncClient(timeout=8.0) as client:
            for server in servers:
                if RadioBrowserApi._unavailable_until.get(server, 0.0) > loop.time():
                    continue
                await _limiter.wait()
                if RadioBrowserApi._unavailable_until.get(server, 0.0) > loop.time():
                    continue
                try:
                    response = await client.get(f"{server}{path}", params=params, headers=headers)
                    response.raise_for_status()
                    raw_data: list[dict[str, Any]] = response.json()
                    RadioBrowserApi._preferred_server = server
                    return Result(code=ResultCode.OK, message="OK", result=raw_data)
                except (httpx.ConnectError, httpx.TimeoutException) as error:
                    RadioBrowserApi._unavailable_until[server] = (
                        loop.time() + SERVER_COOLDOWN_SECONDS
                    )
                    logger.warning(
                        "Radio Browser connection failed (%s) at %s; trying an available mirror",
                        type(error).__name__,
                        server,
                    )
                except httpx.HTTPStatusError as error:
                    # Share rate-limit cooldown across mirrors instead of retrying elsewhere.
                    if error.response.status_code == 429:
                        retry_after = error.response.headers.get("Retry-After", "30")
                        try:
                            delay: float = float(retry_after)
                        except ValueError:
                            try:
                                deadline = parsedate_to_datetime(retry_after)
                                delay = (deadline - datetime.now(UTC)).total_seconds()
                            except (TypeError, ValueError, OverflowError):
                                delay = SERVER_COOLDOWN_SECONDS
                        for mirror in RADIO_BROWSER_SERVERS:
                            RadioBrowserApi._unavailable_until[mirror] = loop.time() + max(
                                SERVER_COOLDOWN_SECONDS, delay
                            )
                    logger.error(
                        "Radio Browser HTTP %s at %s",
                        error.response.status_code,
                        server,
                    )
                    return Result(
                        code=ResultCode.GENERAL_ERROR,
                        message=f"Radio Browser HTTP {error.response.status_code}",
                    )
                except Exception as error:
                    logger.error("Radio Browser API error at %s", server, exc_info=True)
                    return Result(
                        code=ResultCode.GENERAL_ERROR,
                        message=f"Radio Browser API error: {error}",
                    )
        return Result(
            code=ResultCode.GENERAL_ERROR,
            message="Unable to connect to Radio Browser servers",
        )

    @staticmethod
    def _parse_stations(
        raw_data: list[dict[str, Any]],
    ) -> list[RadioBrowserStationResponse]:
        """Parse raw API response into station response models."""

        return [RadioBrowserStationResponse.model_validate(item) for item in raw_data]

    @staticmethod
    @time_it
    async def search_stations_async(
        query: str,
        limit: int = SEARCH_LIMIT,
    ) -> Result[list[RadioBrowserStationResponse]]:
        """Search stations by name via Radio Browser API."""

        if not query.strip():
            return Result(code=ResultCode.OK, message="OK", result=[])

        url = f"{RADIO_BROWSER_BASE}/stations/byname/{quote(query)}"
        params: dict[str, Any] = {
            "limit": limit,
            "offset": 0,
            "hidebroken": "true",
            "order": "clickcount",
            "reverse": "true",
        }

        a_result = await RadioBrowserApi._request(url=url, params=params)
        if a_result.is_not_ok():
            return Result(code=a_result.code(), message=a_result.message())

        raw_data: list[dict[str, Any]] = a_result.result()
        if not raw_data:
            return Result(code=ResultCode.OK, message="OK", result=[])

        return Result(
            code=ResultCode.OK,
            message="OK",
            result=RadioBrowserApi._parse_stations(raw_data),
        )

    @staticmethod
    @time_it
    async def get_stations_by_country_async(
        country: str,
    ) -> Result[list[RadioBrowserStationResponse]]:
        """Get stations by country via Radio Browser API."""

        if not country.strip():
            return Result(code=ResultCode.OK, message="OK", result=[])

        url = f"{RADIO_BROWSER_BASE}/stations/bycountry/{quote(country)}"
        params: dict[str, Any] = {
            "limit": COUNTRY_LIMIT,
            "offset": 0,
            "hidebroken": "true",
            "order": "clickcount",
            "reverse": "true",
        }

        a_result = await RadioBrowserApi._request(url=url, params=params)
        if a_result.is_not_ok():
            return Result(code=a_result.code(), message=a_result.message())

        raw_data: list[dict[str, Any]] = a_result.result()
        if not raw_data:
            return Result(code=ResultCode.OK, message="OK", result=[])

        return Result(
            code=ResultCode.OK,
            message="OK",
            result=RadioBrowserApi._parse_stations(raw_data),
        )

    @staticmethod
    @time_it
    async def get_station_by_uuid_async(
        uuid: str,
    ) -> Result[RadioBrowserStationResponse]:
        """Get a station by its Radio Browser UUID."""

        url = f"{RADIO_BROWSER_BASE}/stations/byuuid/{uuid}"

        a_result = await RadioBrowserApi._request(url=url)
        if a_result.is_not_ok():
            return Result(code=a_result.code(), message=a_result.message())

        raw_data: list[dict[str, Any]] = a_result.result()
        if not raw_data:
            return Result(
                code=ResultCode.NOT_FOUND,
                message="Station not found on Radio Browser",
            )

        return Result(
            code=ResultCode.OK,
            message="OK",
            result=RadioBrowserStationResponse.model_validate(raw_data[0]),
        )
