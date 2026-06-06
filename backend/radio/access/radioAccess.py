import uuid
import os
import requests as req
from typing import List, Tuple

from sqlalchemy import Result, Select, and_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.constants import IMAGES_PATH
from backend.utils.logger import getLogger
from backend.utils.backendUtils import create_id, time_it

from backend.core.aResult import AResult, AResultCode

from backend.core.access.db.ormModels.image import ImageRow
from backend.core.access.db.ormModels.media import CoreMediaRow
from backend.core.access.imageAccess import ImageAccess
from backend.core.enums.mediaTypeEnum import MediaTypeEnum

from backend.radio.access.db.ormModels.station import StationRow

logger = getLogger(__name__)


class RadioAccess:
    @staticmethod
    async def get_station_from_radio_id_async(
        session: AsyncSession,
        radio_id: str,
    ) -> AResult[StationRow]:
        """Get a station by its Radio Browser UUID."""

        try:
            stmt: Select[Tuple[StationRow]] = (
                select(StationRow)
                .where(StationRow.radio_id == radio_id)
                .options(selectinload(StationRow.core_station))
            )
            result: Result[Tuple[StationRow]] = await session.execute(stmt)
            station: StationRow | None = result.scalar_one_or_none()

            if not station:
                return AResult(code=AResultCode.NOT_FOUND, message="Station not found")

            return AResult(code=AResultCode.OK, message="OK", result=station)

        except Exception as e:
            logger.error(f"Failed to get station from radio_id {radio_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get station from radio_id {radio_id}: {e}",
            )

    @staticmethod
    async def get_station_from_public_id_async(
        session: AsyncSession,
        public_id: str,
    ) -> AResult[StationRow]:
        """Get a station by its public_id."""

        try:
            stmt: Select[Tuple[StationRow]] = (
                select(StationRow)
                .join(
                    CoreMediaRow,
                    and_(
                        CoreMediaRow.id == StationRow.id,
                        CoreMediaRow.media_type_key == MediaTypeEnum.RADIO.value,
                    ),
                )
                .where(CoreMediaRow.public_id == public_id)
                .options(selectinload(StationRow.core_station))
            )
            result: Result[Tuple[StationRow]] = await session.execute(stmt)
            station: StationRow | None = result.scalar_one_or_none()

            if not station:
                return AResult(code=AResultCode.NOT_FOUND, message="Station not found")

            return AResult(code=AResultCode.OK, message="OK", result=station)

        except Exception as e:
            logger.error(f"Failed to get station from public_id {public_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get station from public_id {public_id}: {e}",
            )

    @staticmethod
    async def get_stations_from_public_ids_async(
        session: AsyncSession,
        public_ids: List[str],
    ) -> AResult[List[StationRow]]:
        """Get stations by public_ids."""

        try:
            stmt: Select[Tuple[StationRow]] = (
                select(StationRow)
                .join(
                    CoreMediaRow,
                    and_(
                        CoreMediaRow.id == StationRow.id,
                        CoreMediaRow.media_type_key == MediaTypeEnum.RADIO.value,
                    ),
                )
                .where(CoreMediaRow.public_id.in_(public_ids))
                .options(selectinload(StationRow.core_station))
            )
            result: Result[Tuple[StationRow]] = await session.execute(stmt)
            stations: List[StationRow] = list(result.scalars().all())

            return AResult(code=AResultCode.OK, message="OK", result=stations)

        except Exception as e:
            logger.error(f"Failed to get stations from public_ids {public_ids}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get stations from public_ids {public_ids}: {e}",
            )

    @staticmethod
    async def get_stations_with_geo_async(
        session: AsyncSession,
        limit: int = 1000,
        offset: int = 0,
    ) -> AResult[List[StationRow]]:
        """Get stations that have geo coordinates."""

        try:
            stmt: Select[Tuple[StationRow]] = (
                select(StationRow)
                .join(
                    CoreMediaRow,
                    and_(
                        CoreMediaRow.id == StationRow.id,
                        CoreMediaRow.media_type_key == MediaTypeEnum.RADIO.value,
                    ),
                )
                .where(
                    and_(
                        StationRow.geo_lat.isnot(None),
                        StationRow.geo_long.isnot(None),
                    )
                )
                .options(selectinload(StationRow.core_station))
                .offset(offset)
                .limit(limit)
            )
            result: Result[Tuple[StationRow]] = await session.execute(stmt)
            stations: List[StationRow] = list(result.scalars().all())

            return AResult(code=AResultCode.OK, message="OK", result=stations)

        except Exception as e:
            logger.error(f"Failed to get stations with geo: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get stations with geo: {e}",
            )

    @staticmethod
    @time_it
    async def _download_and_create_internal_image_async(
        session: AsyncSession,
        url: str,
    ) -> AResult[ImageRow]:
        """Download a favicon and create an internal image record."""

        try:
            if not url:
                return AResult(
                    code=AResultCode.GENERAL_ERROR,
                    message="No image URL provided",
                )

            response = req.get(url, timeout=10)
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
                logger.error(f"Error creating image: {a_result_image.info()}")
                return AResult(
                    code=a_result_image.code(),
                    message=a_result_image.message(),
                )

            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=a_result_image.result(),
            )

        except Exception as e:
            logger.error(f"Failed to download/create internal image: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to download/create internal image: {e}",
            )

    @staticmethod
    @time_it
    async def get_or_create_station_async(
        session: AsyncSession,
        radio_id: str,
        name: str,
        stream_url: str,
        provider_id: int,
        homepage: str | None = None,
        favicon_url: str | None = None,
        country: str | None = None,
        country_code: str | None = None,
        state: str | None = None,
        language: str | None = None,
        language_codes: str | None = None,
        codec: str | None = None,
        bitrate: int | None = None,
        tags: str | None = None,
        votes: int | None = None,
        geo_lat: float | None = None,
        geo_long: float | None = None,
    ) -> AResult[StationRow]:
        """Get an existing station or create a new one."""

        try:
            a_result_existing = await RadioAccess.get_station_from_radio_id_async(
                session=session, radio_id=radio_id
            )
            if a_result_existing.is_ok():
                return AResult(
                    code=AResultCode.OK,
                    message="OK",
                    result=a_result_existing.result(),
                )

            try:
                async with session.begin_nested():
                    core_station = CoreMediaRow(
                        public_id=create_id(32),
                        provider_id=provider_id,
                        media_type_key=MediaTypeEnum.RADIO.value,
                    )
                    session.add(core_station)
                    await session.flush()

                    station_row = StationRow(
                        id=core_station.id,
                        radio_id=radio_id,
                        name=name,
                        stream_url=stream_url,
                        homepage=homepage,
                        favicon_url=favicon_url,
                        country=country,
                        country_code=country_code,
                        state=state,
                        language=language,
                        language_codes=language_codes,
                        codec=codec,
                        bitrate=bitrate,
                        tags=tags,
                        votes=votes,
                        geo_lat=geo_lat,
                        geo_long=geo_long,
                    )
                    session.add(station_row)
                    await session.flush()

                    station_row.core_station = core_station
            except IntegrityError:
                a_result_existing = await RadioAccess.get_station_from_radio_id_async(
                    session=session, radio_id=radio_id
                )
                if a_result_existing.is_ok():
                    return AResult(
                        code=AResultCode.OK,
                        message="OK",
                        result=a_result_existing.result(),
                    )
                return AResult(
                    code=AResultCode.GENERAL_ERROR,
                    message="Failed to get/create station after concurrent insert",
                )

            return AResult(code=AResultCode.OK, message="OK", result=station_row)

        except Exception as e:
            logger.error(f"Failed to get/create station: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get/create station: {e}",
            )
