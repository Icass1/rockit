from typing import List, Tuple

from sqlalchemy import Result, Select, and_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.utils.logger import getLogger
from backend.utils.backendUtils import create_id, time_it

from backend.core.aResult import AResult, AResultCode

from backend.core.access.db.ormModels.media import CoreMediaRow
from backend.core.enums.mediaTypeEnum import MediaTypeEnum

from backend.radioBrowser.access.db.ormModels.station import StationRow
from backend.radioBrowser.access.db.ormModels.tag import TagRow
from backend.radioBrowser.access.db.ormModels.languageCode import (
    LanguageCodeRow,
)
from backend.radioBrowser.access.db.ormModels.stationTag import StationTagRow
from backend.radioBrowser.access.db.ormModels.stationLanguageCode import (
    StationLanguageCodeRow,
)
from backend.radioBrowser.access.db.ormModels.country import CountryRow
from backend.radioBrowser.access.db.ormModels.state import StateRow
from backend.radioBrowser.access.db.ormModels.codec import CodecRow

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
                .options(
                    selectinload(StationRow.core_station),
                    selectinload(StationRow.tags_rel),
                    selectinload(StationRow.language_codes_rel),
                    selectinload(StationRow.country_rel),
                    selectinload(StationRow.state_rel),
                    selectinload(StationRow.codec_rel),
                )
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
                .options(
                    selectinload(StationRow.core_station),
                    selectinload(StationRow.tags_rel),
                    selectinload(StationRow.language_codes_rel),
                    selectinload(StationRow.country_rel),
                    selectinload(StationRow.state_rel),
                    selectinload(StationRow.codec_rel),
                )
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
                .options(
                    selectinload(StationRow.core_station),
                    selectinload(StationRow.tags_rel),
                    selectinload(StationRow.language_codes_rel),
                    selectinload(StationRow.country_rel),
                    selectinload(StationRow.state_rel),
                    selectinload(StationRow.codec_rel),
                )
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
                .options(
                    selectinload(StationRow.core_station),
                    selectinload(StationRow.tags_rel),
                    selectinload(StationRow.language_codes_rel),
                    selectinload(StationRow.country_rel),
                    selectinload(StationRow.state_rel),
                    selectinload(StationRow.codec_rel),
                )
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
    async def get_or_create_tag_async(
        session: AsyncSession,
        tag_name: str,
    ) -> AResult[TagRow]:
        """Get an existing tag or create a new one."""

        try:
            stmt = select(TagRow).where(TagRow.tag == tag_name)
            result = await session.execute(stmt)
            tag_row: TagRow | None = result.scalar_one_or_none()

            if tag_row:
                return AResult(code=AResultCode.OK, message="OK", result=tag_row)

            tag_row = TagRow(tag=tag_name)
            session.add(tag_row)
            await session.flush()

            return AResult(code=AResultCode.OK, message="OK", result=tag_row)

        except IntegrityError:
            stmt = select(TagRow).where(TagRow.tag == tag_name)
            result = await session.execute(stmt)
            tag_row = result.scalar_one_or_none()
            if tag_row:
                return AResult(code=AResultCode.OK, message="OK", result=tag_row)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get/create tag: {tag_name}",
            )

        except Exception as e:
            logger.error(f"Failed to get/create tag: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get/create tag: {e}",
            )

    @staticmethod
    @time_it
    async def get_or_create_language_code_async(
        session: AsyncSession,
        language_code: str,
    ) -> AResult[LanguageCodeRow]:
        """Get an existing language code or create a new one."""

        try:
            stmt = select(LanguageCodeRow).where(
                LanguageCodeRow.language_code == language_code
            )
            result = await session.execute(stmt)
            lc_row: LanguageCodeRow | None = result.scalar_one_or_none()

            if lc_row:
                return AResult(code=AResultCode.OK, message="OK", result=lc_row)

            lc_row = LanguageCodeRow(language_code=language_code)
            session.add(lc_row)
            await session.flush()

            return AResult(code=AResultCode.OK, message="OK", result=lc_row)

        except IntegrityError:
            stmt = select(LanguageCodeRow).where(
                LanguageCodeRow.language_code == language_code
            )
            result = await session.execute(stmt)
            lc_row = result.scalar_one_or_none()
            if lc_row:
                return AResult(code=AResultCode.OK, message="OK", result=lc_row)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get/create language code: {language_code}",
            )

        except Exception as e:
            logger.error(f"Failed to get/create language code: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get/create language code: {e}",
            )

    @staticmethod
    @time_it
    async def get_or_create_country_async(
        session: AsyncSession,
        name: str,
        country_code: str,
    ) -> AResult[CountryRow]:
        """Get an existing country or create a new one."""

        try:
            stmt = select(CountryRow).where(CountryRow.name == name)
            result = await session.execute(stmt)
            country_row: CountryRow | None = result.scalar_one_or_none()

            if country_row:
                return AResult(code=AResultCode.OK, message="OK", result=country_row)

            country_row = CountryRow(name=name, country_code=country_code)
            session.add(country_row)
            await session.flush()

            return AResult(code=AResultCode.OK, message="OK", result=country_row)

        except IntegrityError:
            stmt = select(CountryRow).where(CountryRow.name == name)
            result = await session.execute(stmt)
            country_row = result.scalar_one_or_none()
            if country_row:
                return AResult(code=AResultCode.OK, message="OK", result=country_row)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get/create country: {name}",
            )

        except Exception as e:
            logger.error(f"Failed to get/create country: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get/create country: {e}",
            )

    @staticmethod
    @time_it
    async def get_or_create_state_async(
        session: AsyncSession,
        name: str,
        country_id: int | None = None,
    ) -> AResult[StateRow]:
        """Get an existing state or create a new one."""

        try:
            stmt = select(StateRow).where(
                and_(
                    StateRow.name == name,
                    StateRow.country_id == country_id,
                )
            )
            result = await session.execute(stmt)
            state_row: StateRow | None = result.scalar_one_or_none()

            if state_row:
                return AResult(code=AResultCode.OK, message="OK", result=state_row)

            state_row = StateRow(name=name, country_id=country_id)
            session.add(state_row)
            await session.flush()

            return AResult(code=AResultCode.OK, message="OK", result=state_row)

        except IntegrityError:
            stmt = select(StateRow).where(
                and_(
                    StateRow.name == name,
                    StateRow.country_id == country_id,
                )
            )
            result = await session.execute(stmt)
            state_row = result.scalar_one_or_none()
            if state_row:
                return AResult(code=AResultCode.OK, message="OK", result=state_row)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get/create state: {name}",
            )

        except Exception as e:
            logger.error(f"Failed to get/create state: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get/create state: {e}",
            )

    @staticmethod
    @time_it
    async def get_or_create_codec_async(
        session: AsyncSession,
        name: str,
    ) -> AResult[CodecRow]:
        """Get an existing codec or create a new one."""

        try:
            stmt = select(CodecRow).where(CodecRow.name == name)
            result = await session.execute(stmt)
            codec_row: CodecRow | None = result.scalar_one_or_none()

            if codec_row:
                return AResult(code=AResultCode.OK, message="OK", result=codec_row)

            codec_row = CodecRow(name=name)
            session.add(codec_row)
            await session.flush()

            return AResult(code=AResultCode.OK, message="OK", result=codec_row)

        except IntegrityError:
            stmt = select(CodecRow).where(CodecRow.name == name)
            result = await session.execute(stmt)
            codec_row = result.scalar_one_or_none()
            if codec_row:
                return AResult(code=AResultCode.OK, message="OK", result=codec_row)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get/create codec: {name}",
            )

        except Exception as e:
            logger.error(f"Failed to get/create codec: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get/create codec: {e}",
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
        codec: str | None = None,
        bitrate: int | None = None,
        votes: int | None = None,
        geo_lat: float | None = None,
        geo_long: float | None = None,
        tags: List[str] | None = None,
        language_codes: List[str] | None = None,
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

            country_id: int | None = None
            state_id: int | None = None
            codec_id: int | None = None

            if country and country_code:
                a_result_country = await RadioAccess.get_or_create_country_async(
                    session=session, name=country, country_code=country_code
                )
                if a_result_country.is_ok():
                    country_id = a_result_country.result().id

            if state:
                a_result_state = await RadioAccess.get_or_create_state_async(
                    session=session, name=state, country_id=country_id
                )
                if a_result_state.is_ok():
                    state_id = a_result_state.result().id

            if codec:
                a_result_codec = await RadioAccess.get_or_create_codec_async(
                    session=session, name=codec
                )
                if a_result_codec.is_ok():
                    codec_id = a_result_codec.result().id

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
                        language=language,
                        bitrate=bitrate,
                        votes=votes,
                        geo_lat=geo_lat,
                        geo_long=geo_long,
                        country_id=country_id,
                        state_id=state_id,
                        codec_id=codec_id,
                    )
                    session.add(station_row)
                    await session.flush()

                    if tags:
                        for tag_name in tags:
                            tag_name = tag_name.strip()
                            if not tag_name:
                                continue
                            a_result_tag = await RadioAccess.get_or_create_tag_async(
                                session=session, tag_name=tag_name
                            )
                            if a_result_tag.is_ok():
                                tag_row = a_result_tag.result()
                                junction = StationTagRow(
                                    station_id=station_row.id, tag_id=tag_row.id
                                )
                                session.add(junction)

                    if language_codes:
                        for lc in language_codes:
                            lc = lc.strip()
                            if not lc:
                                continue
                            a_result_lc = (
                                await RadioAccess.get_or_create_language_code_async(
                                    session=session, language_code=lc
                                )
                            )
                            if a_result_lc.is_ok():
                                lc_row = a_result_lc.result()
                                junction = StationLanguageCodeRow(
                                    station_id=station_row.id,
                                    language_code_id=lc_row.id,
                                )
                                session.add(junction)

                    await session.flush()

                    station_row.core_station = core_station

                    await session.refresh(
                        station_row,
                        [
                            "tags_rel",
                            "language_codes_rel",
                            "country_rel",
                            "state_rel",
                            "codec_rel",
                        ],
                    )
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
