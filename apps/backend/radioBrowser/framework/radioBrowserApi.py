from __future__ import annotations

import asyncio
import httpx
from urllib.parse import quote
from logging import Logger
from typing import Any, Dict, List

from backend.utils.logger import getLogger
from backend.utils.backendUtils import time_it

from backend.core.aResult import AResult, AResultCode

from backend.radioBrowser.responses.radioBrowserStation import (
    RadioBrowserStationResponse,
)

logger: Logger = getLogger(__name__)

RADIO_BROWSER_BASE = "https://de1.api.radio-browser.info/json"
SEARCH_LIMIT = 25
COUNTRY_LIMIT = 100
USER_AGENT = "RockIt/1.0 (self-hosted music player)"
REQUESTS_PER_SECOND = 2


class RateLimiter:
    """Simple rate limiter — ensures at most N requests per second."""

    def __init__(self, rate: int = REQUESTS_PER_SECOND) -> None:
        self.interval: float = 1.0 / rate
        self._last_call: float = 0.0

    async def wait(self) -> None:
        now: float = asyncio.get_event_loop().time()
        elapsed: float = now - self._last_call
        if elapsed < self.interval:
            await asyncio.sleep(self.interval - elapsed)
        self._last_call = asyncio.get_event_loop().time()


_limiter = RateLimiter()


class RadioBrowserApi:
    """API client for the Radio Browser API (radio-browser.info)."""

    @staticmethod
    async def _request(
        url: str, params: Dict[str, Any] | None = None
    ) -> AResult[List[Dict[str, Any]]]:
        """Make an HTTP GET request with rate limiting and User-Agent."""

        await _limiter.wait()
        try:
            headers: Dict[str, str] = {"User-Agent": USER_AGENT}
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.get(url, params=params, headers=headers)
                response.raise_for_status()
                raw_data: List[Dict[str, Any]] = response.json()
            return AResult(code=AResultCode.OK, message="OK", result=raw_data)

        except httpx.TimeoutException:
            logger.warning(f"Radio Browser API timeout: {url}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Radio Browser API timed out",
            )
        except Exception as e:
            logger.error(f"Radio Browser API error: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Radio Browser API error: {e}",
            )

    @staticmethod
    def _parse_stations(
        raw_data: List[Dict[str, Any]],
    ) -> List[RadioBrowserStationResponse]:
        """Parse raw API response into station response models."""

        return [RadioBrowserStationResponse.model_validate(item) for item in raw_data]

    @staticmethod
    @time_it
    async def search_stations_async(
        query: str,
    ) -> AResult[List[RadioBrowserStationResponse]]:
        """Search stations by name via Radio Browser API."""

        if not query.strip():
            return AResult(code=AResultCode.OK, message="OK", result=[])

        url = f"{RADIO_BROWSER_BASE}/stations/byname/{quote(query)}"
        params: Dict[str, Any] = {
            "limit": SEARCH_LIMIT,
            "offset": 0,
            "hidebroken": "true",
            "order": "clickcount",
            "reverse": "true",
        }

        a_result = await RadioBrowserApi._request(url=url, params=params)
        if a_result.is_not_ok():
            return AResult(code=a_result.code(), message=a_result.message())

        raw_data: List[Dict[str, Any]] = a_result.result()
        if not raw_data:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=RadioBrowserApi._parse_stations(raw_data),
        )

    @staticmethod
    @time_it
    async def get_stations_by_country_async(
        country: str,
    ) -> AResult[List[RadioBrowserStationResponse]]:
        """Get stations by country via Radio Browser API."""

        if not country.strip():
            return AResult(code=AResultCode.OK, message="OK", result=[])

        url = f"{RADIO_BROWSER_BASE}/stations/bycountry/{quote(country)}"
        params: Dict[str, Any] = {
            "limit": COUNTRY_LIMIT,
            "offset": 0,
            "hidebroken": "true",
            "order": "clickcount",
            "reverse": "true",
        }

        a_result = await RadioBrowserApi._request(url=url, params=params)
        if a_result.is_not_ok():
            return AResult(code=a_result.code(), message=a_result.message())

        raw_data: List[Dict[str, Any]] = a_result.result()
        if not raw_data:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=RadioBrowserApi._parse_stations(raw_data),
        )

    @staticmethod
    @time_it
    async def get_station_by_uuid_async(
        uuid: str,
    ) -> AResult[RadioBrowserStationResponse]:
        """Get a station by its Radio Browser UUID."""

        url = f"{RADIO_BROWSER_BASE}/stations/byuuid/{uuid}"

        a_result = await RadioBrowserApi._request(url=url)
        if a_result.is_not_ok():
            return AResult(code=a_result.code(), message=a_result.message())

        raw_data: List[Dict[str, Any]] = a_result.result()
        if not raw_data:
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="Station not found on Radio Browser",
            )

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=RadioBrowserStationResponse.model_validate(raw_data[0]),
        )
