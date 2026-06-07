from __future__ import annotations

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


class RadioBrowserApi:
    """API client for the Radio Browser API (radio-browser.info)."""

    @staticmethod
    @time_it
    async def search_stations_async(
        query: str,
    ) -> AResult[List[RadioBrowserStationResponse]]:
        """Search stations by name via Radio Browser API."""

        if not query.strip():
            return AResult(code=AResultCode.OK, message="OK", result=[])

        try:
            url = f"{RADIO_BROWSER_BASE}/stations/byname/{quote(query)}"
            params: Dict[str, Any] = {
                "limit": SEARCH_LIMIT,
                "offset": 0,
                "hidebroken": "true",
                "order": "clickcount",
                "reverse": "true",
            }

            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                raw_data: List[Dict[str, Any]] = response.json()

            if not raw_data:
                return AResult(code=AResultCode.OK, message="OK", result=[])

            stations: List[RadioBrowserStationResponse] = [
                RadioBrowserStationResponse.model_validate(item) for item in raw_data
            ]

            return AResult(code=AResultCode.OK, message="OK", result=stations)

        except httpx.TimeoutException:
            logger.warning(f"Radio Browser API timeout for query: {query}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Radio Browser API timed out",
            )

        except Exception as e:
            logger.error(f"Error searching radio stations: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Error searching radio stations: {e}",
            )

    @staticmethod
    @time_it
    async def get_stations_by_country_async(
        country: str,
    ) -> AResult[List[RadioBrowserStationResponse]]:
        """Get stations by country via Radio Browser API."""

        if not country.strip():
            return AResult(code=AResultCode.OK, message="OK", result=[])

        try:
            url = f"{RADIO_BROWSER_BASE}/stations/bycountry/{quote(country)}"
            params: Dict[str, Any] = {
                "limit": SEARCH_LIMIT,
                "offset": 0,
                "hidebroken": "true",
                "order": "clickcount",
                "reverse": "true",
            }

            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                raw_data: List[Dict[str, Any]] = response.json()

            if not raw_data:
                return AResult(code=AResultCode.OK, message="OK", result=[])

            stations: List[RadioBrowserStationResponse] = [
                RadioBrowserStationResponse.model_validate(item) for item in raw_data
            ]

            return AResult(code=AResultCode.OK, message="OK", result=stations)

        except httpx.TimeoutException:
            logger.warning(f"Radio Browser API timeout for country: {country}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Radio Browser API timed out",
            )

        except Exception as e:
            logger.error(
                f"Error getting stations by country {country}: {e}", exc_info=True
            )
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Error getting stations by country {country}: {e}",
            )

    @staticmethod
    @time_it
    async def get_station_by_uuid_async(
        uuid: str,
    ) -> AResult[RadioBrowserStationResponse]:
        """Get a station by its Radio Browser UUID."""

        try:
            url = f"{RADIO_BROWSER_BASE}/stations/byuuid/{uuid}"
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.get(url)
                response.raise_for_status()
                raw_data: List[Dict[str, Any]] = response.json()

            if not raw_data or len(raw_data) == 0:
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message="Station not found on Radio Browser",
                )

            station = RadioBrowserStationResponse.model_validate(raw_data[0])

            return AResult(code=AResultCode.OK, message="OK", result=station)

        except httpx.TimeoutException:
            logger.warning(f"Radio Browser API timeout for UUID: {uuid}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Radio Browser API timed out",
            )

        except Exception as e:
            logger.error(f"Error getting station by UUID {uuid}: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Error getting station by UUID: {e}",
            )
