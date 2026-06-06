from typing import List, Optional
from logging import Logger

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode
from backend.core.framework.provider.baseMediaProvider import BaseMediaProvider

from backend.core.responses.baseStationResponse import BaseStationResponse

from backend.radio.access.radioAccess import RadioAccess
from backend.radio.access.db.ormModels.station import StationRow

logger: Logger = getLogger(__name__)


class Radio:
    provider: Optional[BaseMediaProvider] = None
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
            Radio._build_station_response_raw(station)
            for station in a_result.result()
        ]

        return AResult(code=AResultCode.OK, message="OK", result=stations)

    @staticmethod
    def _build_station_response_raw(
        station: StationRow,
    ) -> BaseStationResponse:
        """Build a BaseStationResponse from a StationRow without public_id lookup."""

        image_url = ""
        if station.favicon_url:
            image_url = station.favicon_url

        public_id = station.core_station.public_id if station.core_station else ""

        return BaseStationResponse(
            provider=Radio.provider_name,
            publicId=public_id,
            providerUrl=f"/radio/station/{public_id}",
            name=station.name,
            imageUrl=image_url,
            streamUrl=station.stream_url,
            country=station.country,
            countryCode=station.country_code,
            codec=station.codec,
            bitrate=station.bitrate,
            tags=station.tags,
            homepage=station.homepage,
            geoLat=station.geo_lat,
            geoLong=station.geo_long,
        )

    @staticmethod
    def _build_station_response(
        station: StationRow,
        public_id: str,
    ) -> AResult[BaseStationResponse]:
        """Build a BaseStationResponse from a StationRow."""

        image_url = ""
        if station.favicon_url:
            image_url = station.favicon_url

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=BaseStationResponse(
                provider=Radio.provider_name,
                publicId=public_id,
                providerUrl=f"/radio/station/{public_id}",
                name=station.name,
                imageUrl=image_url,
                streamUrl=station.stream_url,
                country=station.country,
                countryCode=station.country_code,
                codec=station.codec,
                bitrate=station.bitrate,
                tags=station.tags,
                homepage=station.homepage,
                geoLat=station.geo_lat,
                geoLong=station.geo_long,
            ),
        )
