import re
import httpx
from urllib.parse import quote
from logging import Logger
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.utils.backendUtils import time_it

from backend.core.aResult import AResult, AResultCode

from backend.core.framework.provider.types import AddFromUrlAResult
from backend.core.framework.provider.baseMediaProvider import BaseMediaProvider
from backend.core.framework.downloader.baseDownload import BaseDownload
from backend.core.framework.models.urlPattern import UrlPattern

from backend.core.responses.searchResponse import (
    ArtistSearchResultsItem,
    BaseSearchResultsItem,
)
from backend.core.responses.baseStationResponse import BaseStationResponse

from backend.radio.framework.radio import Radio
from backend.radio.access.radioAccess import RadioAccess
from backend.radio.access.db.ormModels.station import StationRow

logger: Logger = getLogger(__name__)

RADIO_BROWSER_BASE = "https://de1.api.radio-browser.info/json"

RADIO_URL_PATTERNS: list[UrlPattern] = [
    UrlPattern(
        pattern=re.compile(
            r"https?://(?:www\.)?radio-browser\.info/station/([a-f0-9-]+)"
        ),
        path_template="/radio/station/{}",
    ),
]

SEARCH_LIMIT = 25


class RadioProvider(BaseMediaProvider):
    def set_info(self, provider_id: int, provider_name: str) -> None:
        self._id = provider_id
        self._name = provider_name
        Radio.provider = self
        Radio.provider_name = provider_name

    @time_it
    async def search_media_async(
        self, session: AsyncSession, query: str
    ) -> AResult[List[BaseSearchResultsItem]]:
        """Search radio stations via Radio Browser API."""

        if not query.strip():
            return AResult(code=AResultCode.OK, message="OK", result=[])

        try:
            url = f"{RADIO_BROWSER_BASE}/stations/byname/{quote(query)}"
            params = {
                "limit": SEARCH_LIMIT,
                "offset": 0,
                "hidebroken": "true",
                "order": "clickcount",
                "reverse": "true",
            }

            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                raw_stations = response.json()

            if not raw_stations:
                return AResult(code=AResultCode.OK, message="OK", result=[])

            results: List[BaseSearchResultsItem] = []

            for raw in raw_stations:
                if not isinstance(raw, dict):
                    continue

                radio_id = raw.get("stationuuid", "")
                if not radio_id:
                    continue

                name = raw.get("name", "Unknown Station")
                stream_url = raw.get("url_resolved") or raw.get("url", "")
                favicon = raw.get("favicon", "")

                a_result_station = await RadioAccess.get_or_create_station_async(
                    session=session,
                    radio_id=radio_id,
                    name=name,
                    stream_url=stream_url,
                    provider_id=self._id,
                    homepage=raw.get("homepage"),
                    favicon_url=favicon,
                    country=raw.get("country"),
                    country_code=raw.get("countrycode"),
                    state=raw.get("state"),
                    language=raw.get("language"),
                    language_codes=raw.get("languagecodes"),
                    codec=raw.get("codec"),
                    bitrate=raw.get("bitrate"),
                    tags=raw.get("tags"),
                    votes=raw.get("votes"),
                )
                if a_result_station.is_not_ok():
                    continue

                station: StationRow = a_result_station.result()
                public_id = (
                    station.core_station.public_id if station.core_station else ""
                )

                results.append(
                    BaseSearchResultsItem(
                        type="radio",
                        name=name,
                        providerUrl=f"/radio/station/{public_id}",
                        imageUrl=favicon or "",
                        artists=[],
                        provider=Radio.provider_name,
                        downloaded=None,
                        url=f"/radio/station/{public_id}",
                    )
                )

            return AResult(code=AResultCode.OK, message="OK", result=results)

        except httpx.TimeoutException:
            logger.warning(f"Radio Browser API timeout for query: {query}")
            return AResult(code=AResultCode.OK, message="OK", result=[])

        except Exception as e:
            logger.error(f"Error searching radio stations: {e}")
            return AResult(code=AResultCode.OK, message="OK", result=[])

    @time_it
    async def get_stations_async(
        self, session: AsyncSession, public_ids: List[str]
    ) -> AResult[List[BaseStationResponse]]:
        """Get radio stations by public_ids."""

        results: List[BaseStationResponse] = []

        for public_id in public_ids:
            a_result = await Radio.get_station_from_public_id_async(
                session=session, public_id=public_id
            )
            if a_result.is_ok():
                results.append(a_result.result())

        return AResult(code=AResultCode.OK, message="OK", result=results)

    def match_url(self, url: str) -> str | None:
        """Check if the URL matches a radio browser URL pattern."""

        for up in RADIO_URL_PATTERNS:
            match: re.Match[str] | None = up.pattern.match(url)
            if match:
                return up.path_template.format(match.group(1))
        return None

    async def add_from_url_async(
        self, session: AsyncSession, url: str
    ) -> AResult[AddFromUrlAResult]:
        """Add a station from a Radio Browser URL."""

        path: str | None = self.match_url(url)
        if path is None:
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="URL does not match radio pattern",
            )

        parts = path.split("/")
        if len(parts) < 3:
            return AResult(
                code=AResultCode.BAD_REQUEST,
                message="Invalid radio URL path",
            )

        radio_uuid = parts[-1]

        try:
            api_url = f"{RADIO_BROWSER_BASE}/stations/byuuid/{radio_uuid}"
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.get(api_url)
                response.raise_for_status()
                raw_stations = response.json()

            if (
                not raw_stations
                or not isinstance(raw_stations, list)
                or len(raw_stations) == 0
            ):
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message="Station not found on Radio Browser",
                )

            raw = raw_stations[0]
            if not isinstance(raw, dict):
                return AResult(
                    code=AResultCode.GENERAL_ERROR,
                    message="Invalid response from Radio Browser",
                )

            a_result_station = await RadioAccess.get_or_create_station_async(
                session=session,
                radio_id=raw.get("stationuuid", radio_uuid),
                name=raw.get("name", "Unknown Station"),
                stream_url=raw.get("url_resolved") or raw.get("url", ""),
                provider_id=self._id,
                homepage=raw.get("homepage"),
                favicon_url=raw.get("favicon"),
                country=raw.get("country"),
                country_code=raw.get("countrycode"),
                state=raw.get("state"),
                language=raw.get("language"),
                language_codes=raw.get("languagecodes"),
                codec=raw.get("codec"),
                bitrate=raw.get("bitrate"),
                tags=raw.get("tags"),
                votes=raw.get("votes"),
            )
            if a_result_station.is_not_ok():
                return AResult(
                    code=a_result_station.code(),
                    message=a_result_station.message(),
                )

            station: StationRow = a_result_station.result()
            public_id = station.core_station.public_id if station.core_station else ""

            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=BaseStationResponse(
                    provider=Radio.provider_name,
                    publicId=public_id,
                    providerUrl=f"/radio/station/{public_id}",
                    name=station.name,
                    imageUrl=station.favicon_url or "",
                    streamUrl=station.stream_url,
                    country=station.country,
                    codec=station.codec,
                    bitrate=station.bitrate,
                    tags=station.tags,
                    homepage=station.homepage,
                ),
            )

        except httpx.TimeoutException:
            logger.warning(f"Radio Browser API timeout for UUID: {radio_uuid}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Radio Browser API timed out",
            )
        except Exception as e:
            logger.error(f"Error adding radio station from URL: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Error adding radio station from URL: {e}",
            )

    async def get_media_duration_ms_async(
        self, session: AsyncSession, public_id: str
    ) -> AResult[int]:
        """Radio stations have no fixed duration; return 0."""

        return AResult(code=AResultCode.OK, message="OK", result=0)


provider = RadioProvider()
name = "Radio"
