from __future__ import annotations

import os
import uuid
from logging import Logger
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.constants import IMAGES_PATH

from backend.core.aResult import AResult, AResultCode
from backend.core.framework.provider.baseMediaProvider import BaseMediaProvider

from backend.core.responses.searchResponse import (
    BaseSearchResultsItem,
)
from backend.core.responses.baseStationResponse import BaseStationResponse

from backend.core.access.imageAccess import ImageAccess

from backend.radioBrowser.access.radioAccess import RadioAccess
from backend.radioBrowser.access.db.ormModels.station import StationRow
from backend.radioBrowser.framework.radioBrowserApi import RadioBrowserApi
from backend.radioBrowser.responses.radioBrowserStation import (
    RadioBrowserStationResponse,
)

logger: Logger = getLogger(__name__)


class Radio:
    provider: "BaseMediaProvider"
    provider_name: str = ""

    @staticmethod
    async def get_station_from_public_id_async(
        session: AsyncSession,
        public_id: str,
    ) -> AResult[BaseStationResponse]:
        """Get a station by public_id and return a response."""

        a_result_station: AResult[StationRow] = (
            await RadioAccess.get_station_from_public_id_async(
                session=session, public_id=public_id
            )
        )
        if a_result_station.is_not_ok():
            logger.error(
                f"Error getting station from public id {public_id}. {a_result_station.info()}"
            )
            return AResult(
                code=a_result_station.code(), message=a_result_station.message()
            )

        station: StationRow = a_result_station.result()

        return Radio._build_station_response(station=station, public_id=public_id)

    @staticmethod
    async def get_stations_with_geo_async(
        session: AsyncSession,
        limit: int = 1000,
        offset: int = 0,
    ) -> AResult[List[BaseStationResponse]]:
        """Get stations with geo coordinates."""

        a_result: AResult[List[StationRow]] = (
            await RadioAccess.get_stations_with_geo_async(
                session=session, limit=limit, offset=offset
            )
        )
        if a_result.is_not_ok():
            logger.error(f"Error getting stations with geo. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        stations: List[BaseStationResponse] = [
            Radio._build_station_response_raw(station) for station in a_result.result()
        ]

        return AResult(code=AResultCode.OK, message="OK", result=stations)

    @staticmethod
    def _raw_to_station_data(
        raw: RadioBrowserStationResponse,
    ) -> Dict[str, Any]:
        """Convert a RadioBrowserStationResponse to a dict for batch_create."""

        geo_lat, geo_long = Radio._parse_geo(raw_lat=raw.geo_lat, raw_long=raw.geo_long)
        return {
            "radio_id": raw.stationuuid,
            "name": raw.name,
            "stream_url": raw.url_resolved or raw.url,
            "homepage": raw.homepage,
            "favicon_url": raw.favicon,
            "country": raw.country,
            "country_code": raw.countrycode,
            "state": raw.state,
            "language": raw.language,
            "codec": raw.codec,
            "bitrate": raw.bitrate,
            "votes": raw.votes,
            "geo_lat": geo_lat,
            "geo_long": geo_long,
            "tags": Radio._split_tags(raw.tags),
            "language_codes": Radio._split_language_codes(raw.languagecodes),
        }

    @staticmethod
    async def search_media_async(
        session: AsyncSession,
        query: str,
    ) -> AResult[List[BaseSearchResultsItem]]:
        """Search radio stations via Radio Browser API and persist them."""

        a_result_api = await RadioBrowserApi.search_stations_async(query=query)
        if a_result_api.is_not_ok():
            return AResult(code=a_result_api.code(), message=a_result_api.message())

        raw_stations: List[RadioBrowserStationResponse] = a_result_api.result()
        if not raw_stations:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        a_result_provider_id = Radio.provider.get_id()
        if a_result_provider_id.is_not_ok():
            return AResult(code=AResultCode.GENERAL_ERROR, message="No provider ID")
        provider_id: int = a_result_provider_id.result()

        stations_data: List[Dict[str, Any]] = [
            Radio._raw_to_station_data(raw) for raw in raw_stations
        ]

        a_batch = await RadioAccess.batch_get_or_create_all_async(
            session=session, stations_data=stations_data, provider_id=provider_id
        )
        if a_batch.is_not_ok():
            logger.error(f"Batch station creation failed: {a_batch.info()}")
            return AResult(code=a_batch.code(), message=a_batch.message())

        station_map: Dict[str, StationRow] = a_batch.result()

        results: List[BaseSearchResultsItem] = []
        for sd in stations_data:
            station = station_map.get(sd["radio_id"])
            if not station:
                continue
            public_id = station.core_station.public_id if station.core_station else ""
            if not public_id:
                continue
            results.append(
                BaseSearchResultsItem(
                    type="radio",
                    name=sd["name"],
                    providerUrl=f"/radio/station/{public_id}",
                    imageUrl=sd.get("favicon_url") or "",
                    artists=[],
                    provider=Radio.provider_name,
                    downloaded=None,
                    url=f"/radio/station/{public_id}",
                )
            )

        return AResult(code=AResultCode.OK, message="OK", result=results)

    @staticmethod
    async def get_stations_by_country_async(
        session: AsyncSession,
        country: str,
    ) -> AResult[List[BaseStationResponse]]:
        """Get radio stations by country via Radio Browser API."""

        a_result_api = await RadioBrowserApi.get_stations_by_country_async(
            country=country
        )
        if a_result_api.is_not_ok():
            return AResult(code=a_result_api.code(), message=a_result_api.message())

        raw_stations: List[RadioBrowserStationResponse] = a_result_api.result()
        if not raw_stations:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        a_result_provider_id = Radio.provider.get_id()
        if a_result_provider_id.is_not_ok():
            return AResult(code=AResultCode.GENERAL_ERROR, message="No provider ID")
        provider_id: int = a_result_provider_id.result()

        stations_data: List[Dict[str, Any]] = [
            Radio._raw_to_station_data(raw) for raw in raw_stations
        ]

        a_batch = await RadioAccess.batch_get_or_create_all_async(
            session=session, stations_data=stations_data, provider_id=provider_id
        )
        if a_batch.is_not_ok():
            logger.error(f"Batch station creation failed: {a_batch.info()}")
            return AResult(code=a_batch.code(), message=a_batch.message())

        station_map: Dict[str, StationRow] = a_batch.result()

        results: List[BaseStationResponse] = []
        for sd in stations_data:
            station = station_map.get(sd["radio_id"])
            if not station:
                continue
            public_id = station.core_station.public_id if station.core_station else ""
            if not public_id:
                continue
            results.append(Radio._build_station_response_known(station, public_id))

        return AResult(code=AResultCode.OK, message="OK", result=results)

    @staticmethod
    async def add_from_url_async(
        session: AsyncSession,
        radio_uuid: str,
    ) -> AResult[BaseStationResponse]:
        """Add a station from a Radio Browser UUID."""

        a_result_api = await RadioBrowserApi.get_station_by_uuid_async(uuid=radio_uuid)
        if a_result_api.is_not_ok():
            return AResult(code=a_result_api.code(), message=a_result_api.message())

        raw: RadioBrowserStationResponse = a_result_api.result()

        geo_lat, geo_long = Radio._parse_geo(raw_lat=raw.geo_lat, raw_long=raw.geo_long)

        tags_list = Radio._split_tags(raw.tags)
        language_codes_list = Radio._split_language_codes(raw.languagecodes)

        a_result_provider_id = Radio.provider.get_id()
        if a_result_provider_id.is_not_ok():
            return AResult(
                code=a_result_provider_id.code(),
                message=a_result_provider_id.message(),
            )
        provider_id: int = a_result_provider_id.result()

        a_result_station = await RadioAccess.get_or_create_station_async(
            session=session,
            radio_id=raw.stationuuid,
            name=raw.name,
            stream_url=raw.url_resolved or raw.url,
            provider_id=provider_id,
            homepage=raw.homepage,
            favicon_url=raw.favicon,
            country=raw.country,
            country_code=raw.countrycode,
            state=raw.state,
            language=raw.language,
            codec=raw.codec,
            bitrate=raw.bitrate,
            votes=raw.votes,
            geo_lat=geo_lat,
            geo_long=geo_long,
            tags=tags_list,
            language_codes=language_codes_list,
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
            result=Radio._build_station_response_known(station, public_id),
        )

    @staticmethod
    async def _download_and_create_internal_image_async(
        session: AsyncSession,
        url: str,
    ) -> AResult[str]:
        """Download a favicon, store internally, and return the new path."""

        try:
            if not url:
                return AResult(
                    code=AResultCode.GENERAL_ERROR,
                    message="No image URL provided",
                )

            import httpx

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
                if response.status_code != 200:
                    return AResult(
                        code=AResultCode.GENERAL_ERROR,
                        message="Image download failed",
                    )

                filename = str(uuid.uuid4()) + ".png"
                full_path = os.path.join(IMAGES_PATH, "radio", filename)
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                with open(full_path, "wb") as f:
                    f.write(response.content)

            path = "radio/" + filename
            a_result_image = await ImageAccess.create_image_async(
                session=session,
                path=path,
                url=url,
            )
            if a_result_image.is_not_ok():
                logger.error(
                    f"Error creating image: {a_result_image.info()}", exc_info=True
                )
                return AResult(
                    code=a_result_image.code(),
                    message=a_result_image.message(),
                )

            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=path,
            )

        except Exception as e:
            logger.error(f"Failed to download/create internal image: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to download/create internal image: {e}",
            )

    @staticmethod
    def _build_station_response_known(
        station: StationRow,
        public_id: str,
    ) -> BaseStationResponse:
        """Build a BaseStationResponse from a StationRow with a known public_id."""

        image_url = station.favicon_url or ""

        tags_str = Radio._join_tags(station)

        country_name = station.country_rel.name if station.country_rel else None
        country_code = station.country_rel.country_code if station.country_rel else None
        codec_name = station.codec_rel.name if station.codec_rel else None

        return BaseStationResponse(
            provider=Radio.provider_name,
            publicId=public_id,
            providerUrl=f"/radio/station/{public_id}",
            name=station.name,
            imageUrl=image_url,
            streamUrl=station.stream_url,
            country=country_name,
            countryCode=country_code,
            codec=codec_name,
            bitrate=station.bitrate,
            tags=tags_str,
            homepage=station.homepage,
            geoLat=station.geo_lat,
            geoLong=station.geo_long,
        )

    @staticmethod
    def _build_station_response_raw(
        station: StationRow,
    ) -> BaseStationResponse:
        """Build a BaseStationResponse from a StationRow without public_id lookup."""

        public_id = station.core_station.public_id if station.core_station else ""

        return Radio._build_station_response_known(station, public_id)

    @staticmethod
    def _build_station_response(
        station: StationRow,
        public_id: str,
    ) -> AResult[BaseStationResponse]:
        """Build a BaseStationResponse from a StationRow."""

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=Radio._build_station_response_known(station, public_id),
        )

    @staticmethod
    def _parse_geo(
        raw_lat: float | None,
        raw_long: float | None,
    ) -> tuple[float | None, float | None]:
        """Safely parse geo coordinates."""

        geo_lat: Optional[float] = None
        geo_long: Optional[float] = None
        try:
            if raw_lat is not None:
                geo_lat = float(raw_lat)
            if raw_long is not None:
                geo_long = float(raw_long)
        except (ValueError, TypeError):
            pass
        return geo_lat, geo_long

    @staticmethod
    def _split_tags(tags: str | None) -> List[str]:
        """Split a comma-separated tags string into a list of trimmed strings."""

        if not tags:
            return []
        return [t.strip() for t in tags.split(",") if t.strip()]

    @staticmethod
    def _split_language_codes(language_codes: str | None) -> List[str]:
        """Split a comma-separated language codes string into a list."""

        if not language_codes:
            return []
        return [lc.strip() for lc in language_codes.split(",") if lc.strip()]

    @staticmethod
    def _join_tags(station: StationRow) -> str | None:
        """Join tag relationship into a comma-separated string."""

        if not station.tags_rel:
            return None
        return ", ".join(sorted([t.tag for t in station.tags_rel]))

    @staticmethod
    def _join_language_codes(station: StationRow) -> str | None:
        """Join language code relationship into a comma-separated string."""

        if not station.language_codes_rel:
            return None
        return ", ".join(
            sorted([lc.language_code for lc in station.language_codes_rel])
        )
