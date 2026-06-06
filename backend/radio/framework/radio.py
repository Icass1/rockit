from typing import List
from logging import Logger

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.utils.backendUtils import time_it

from backend.core.aResult import AResult, AResultCode
from backend.core.framework.provider.baseMediaProvider import BaseMediaProvider

from backend.core.responses.baseStationResponse import BaseStationResponse

from backend.radio.access.radioAccess import RadioAccess
from backend.radio.access.db.ormModels.station import StationRow

logger: Logger = getLogger(__name__)


class Radio:
    provider: BaseMediaProvider = None
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
                codec=station.codec,
                bitrate=station.bitrate,
                tags=station.tags,
                homepage=station.homepage,
            ),
        )
