from __future__ import annotations

import re
from logging import Logger
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.framework.provider.types import AddFromUrlAResult
from backend.core.framework.provider.baseMediaProvider import BaseMediaProvider
from backend.core.framework.models.urlPattern import UrlPattern

from backend.core.responses.searchResponse import BaseSearchResultsItem
from backend.core.responses.baseStationResponse import BaseStationResponse

from backend.radioBrowser.framework.radio import Radio

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


class RadioBrowserProvider(BaseMediaProvider):
    def set_info(self, provider_id: int, provider_name: str) -> None:
        self._id = provider_id
        self._name = provider_name
        Radio.provider = self
        Radio.provider_name = provider_name

    async def search_media_async(
        self, session: AsyncSession, query: str
    ) -> AResult[List[BaseSearchResultsItem]]:
        return await Radio.search_media_async(session=session, query=query)

    async def get_stations_async(
        self, session: AsyncSession, public_ids: List[str]
    ) -> AResult[List[BaseStationResponse]]:
        results: List[BaseStationResponse] = []

        for public_id in public_ids:
            a_result = await Radio.get_station_from_public_id_async(
                session=session, public_id=public_id
            )
            if a_result.is_ok():
                results.append(a_result.result())

        return AResult(code=AResultCode.OK, message="OK", result=results)

    def match_url(self, url: str) -> str | None:
        for up in RADIO_URL_PATTERNS:
            match: re.Match[str] | None = up.pattern.match(url)
            if match:
                return up.path_template.format(match.group(1))
        return None

    async def add_from_url_async(
        self, session: AsyncSession, url: str
    ) -> AResult[AddFromUrlAResult]:
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

        a_result = await Radio.add_from_url_async(
            session=session, radio_uuid=radio_uuid
        )
        if a_result.is_ok():
            return AResult(code=AResultCode.OK, message="OK", result=a_result.result())
        return AResult(code=a_result.code(), message=a_result.message())

    async def get_media_duration_ms_async(
        self, session: AsyncSession, public_id: str
    ) -> AResult[int]:
        return AResult(code=AResultCode.OK, message="OK", result=0)


provider = RadioBrowserProvider()
name = "Radio"
