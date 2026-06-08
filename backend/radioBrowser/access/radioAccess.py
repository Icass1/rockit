from typing import Any, Dict, List, Set, Tuple

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
    async def batch_get_existing_radio_ids_async(
        session: AsyncSession,
        radio_ids: List[str],
    ) -> AResult[Set[str]]:
        """Given a list of radio_ids, return the subset that already exist in DB."""

        if not radio_ids:
            return AResult(code=AResultCode.OK, message="OK", result=set())

        try:
            stmt = select(StationRow.radio_id).where(StationRow.radio_id.in_(radio_ids))
            result = await session.execute(stmt)
            existing: Set[str] = {row[0] for row in result.all()}
            return AResult(code=AResultCode.OK, message="OK", result=existing)
        except Exception as e:
            logger.error(f"Failed to batch-check existing radio_ids: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to batch-check existing radio_ids: {e}",
            )

    @staticmethod
    async def batch_get_stations_by_radio_ids_async(
        session: AsyncSession,
        radio_ids: List[str],
    ) -> AResult[Dict[str, StationRow]]:
        """Load multiple stations by their radio_ids in a single query."""

        if not radio_ids:
            return AResult(code=AResultCode.OK, message="OK", result={})

        try:
            stmt = (
                select(StationRow)
                .where(StationRow.radio_id.in_(radio_ids))
                .options(
                    selectinload(StationRow.core_station),
                    selectinload(StationRow.tags_rel),
                    selectinload(StationRow.language_codes_rel),
                    selectinload(StationRow.country_rel),
                    selectinload(StationRow.state_rel),
                    selectinload(StationRow.codec_rel),
                )
            )
            result = await session.execute(stmt)
            stations: Dict[str, StationRow] = {
                s.radio_id: s for s in result.scalars().all()
            }
            return AResult(code=AResultCode.OK, message="OK", result=stations)
        except Exception as e:
            logger.error(f"Failed to batch-get stations by radio_ids: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to batch-get stations by radio_ids: {e}",
            )

    @staticmethod
    async def batch_get_or_create_all_async(
        session: AsyncSession,
        stations_data: List[Dict[str, Any]],
        provider_id: int,
    ) -> AResult[Dict[str, StationRow]]:
        """Batch get or create multiple stations at once.

        1. Single query to find which radio_ids already exist
        2. Batch-load existing stations
        3. Batch-create new stations (no per-station existence checks)
        """

        if not stations_data:
            return AResult(code=AResultCode.OK, message="OK", result={})

        try:
            radio_ids: List[str] = [sd["radio_id"] for sd in stations_data]

            a_existing = await RadioAccess.batch_get_existing_radio_ids_async(
                session=session, radio_ids=radio_ids
            )
            if a_existing.is_not_ok():
                return AResult(code=a_existing.code(), message=a_existing.message())
            existing_ids: Set[str] = a_existing.result()

            result_map: Dict[str, StationRow] = {}

            if existing_ids:
                a_loaded = await RadioAccess.batch_get_stations_by_radio_ids_async(
                    session=session, radio_ids=list(existing_ids)
                )
                if a_loaded.is_ok():
                    result_map.update(a_loaded.result())

            new_data = [
                sd for sd in stations_data if sd["radio_id"] not in existing_ids
            ]

            if not new_data:
                return AResult(code=AResultCode.OK, message="OK", result=result_map)

            await RadioAccess._batch_create_new_stations_async(
                session=session,
                stations_data=new_data,
                provider_id=provider_id,
                result_map=result_map,
            )

            return AResult(code=AResultCode.OK, message="OK", result=result_map)

        except Exception as e:
            logger.error(f"Failed to batch get-or-create stations: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to batch get-or-create stations: {e}",
            )

    @staticmethod
    async def _batch_create_new_stations_async(
        session: AsyncSession,
        stations_data: List[Dict[str, Any]],
        provider_id: int,
        result_map: Dict[str, StationRow],
    ) -> None:
        """Create multiple new stations in bulk (no per-station existence checks)."""

        all_tags: Set[str] = set()
        all_lc: Set[str] = set()
        country_name_code: Dict[str, str] = {}
        all_states: Set[str] = set()
        all_codecs: Set[str] = set()

        for sd in stations_data:
            if sd.get("tags"):
                all_tags.update(t for t in sd["tags"] if t.strip())
            if sd.get("language_codes"):
                all_lc.update(lc for lc in sd["language_codes"] if lc.strip())
            if sd.get("country") and sd.get("country_code"):
                country_name_code[sd["country"]] = sd["country_code"]
            if sd.get("state"):
                all_states.add(sd["state"])
            if sd.get("codec"):
                all_codecs.add(sd["codec"])

        tag_map: Dict[str, TagRow] = {}
        for tag_name in sorted(all_tags):
            a_r = await RadioAccess.get_or_create_tag_async(
                session=session, tag_name=tag_name
            )
            if a_r.is_ok():
                tag_map[tag_name] = a_r.result()

        lc_map: Dict[str, LanguageCodeRow] = {}
        for lc in sorted(all_lc):
            a_r = await RadioAccess.get_or_create_language_code_async(
                session=session, language_code=lc
            )
            if a_r.is_ok():
                lc_map[lc] = a_r.result()

        country_map: Dict[str, CountryRow] = {}
        for name in sorted(country_name_code.keys()):
            a_r = await RadioAccess.get_or_create_country_async(
                session=session, name=name, country_code=country_name_code[name]
            )
            if a_r.is_ok():
                country_map[name] = a_r.result()

        codec_map: Dict[str, CodecRow] = {}
        for name in sorted(all_codecs):
            a_r = await RadioAccess.get_or_create_codec_async(
                session=session, name=name
            )
            if a_r.is_ok():
                codec_map[name] = a_r.result()

        for sd in stations_data:
            country_name = sd.get("country")
            country_id = (
                country_map[country_name].id if country_name in country_map else None
            )

            if sd.get("state") and country_id:
                a_r = await RadioAccess.get_or_create_state_async(
                    session=session, name=sd["state"], country_id=country_id
                )
                state_id = a_r.result().id if a_r.is_ok() else None
            else:
                state_id = None

            codec_name = sd.get("codec")
            codec_id = codec_map[codec_name].id if codec_name in codec_map else None

            try:
                async with session.begin_nested():
                    await RadioAccess._create_single_station_in_savepoint_async(
                        session=session,
                        sd=sd,
                        provider_id=provider_id,
                        country_id=country_id,
                        state_id=state_id,
                        codec_id=codec_id,
                        tag_map=tag_map,
                        lc_map=lc_map,
                        result_map=result_map,
                    )
            except IntegrityError:
                a_existing = await RadioAccess.batch_get_stations_by_radio_ids_async(
                    session=session, radio_ids=[sd["radio_id"]]
                )
                if a_existing.is_ok() and sd["radio_id"] in a_existing.result():
                    result_map[sd["radio_id"]] = a_existing.result()[sd["radio_id"]]
                else:
                    logger.error(
                        f"Failed to create station after retry: {sd['radio_id']}"
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
    async def _create_single_station_in_savepoint_async(
        session: AsyncSession,
        sd: Dict[str, Any],
        provider_id: int,
        country_id: int | None,
        state_id: int | None,
        codec_id: int | None,
        tag_map: Dict[str, TagRow],
        lc_map: Dict[str, LanguageCodeRow],
        result_map: Dict[str, StationRow],
    ) -> None:
        """Create a single station inside a savepoint (caller must handle IntegrityError)."""

        core = CoreMediaRow(
            public_id=create_id(32),
            provider_id=provider_id,
            media_type_key=MediaTypeEnum.RADIO.value,
        )
        session.add(core)
        await session.flush()

        station = StationRow(
            id=core.id,
            radio_id=sd["radio_id"],
            name=sd["name"],
            stream_url=sd["stream_url"],
            homepage=sd.get("homepage"),
            favicon_url=sd.get("favicon_url"),
            language=sd.get("language"),
            bitrate=sd.get("bitrate"),
            votes=sd.get("votes"),
            geo_lat=sd.get("geo_lat"),
            geo_long=sd.get("geo_long"),
            country_id=country_id,
            state_id=state_id,
            codec_id=codec_id,
        )
        session.add(station)
        await session.flush()

        if sd.get("tags"):
            for tag_name in sd["tags"]:
                tag_name = tag_name.strip()
                if not tag_name or tag_name not in tag_map:
                    continue
                junction = StationTagRow(
                    station_id=station.id, tag_id=tag_map[tag_name].id
                )
                session.add(junction)

        if sd.get("language_codes"):
            for lc in sd["language_codes"]:
                lc = lc.strip()
                if not lc or lc not in lc_map:
                    continue
                junction = StationLanguageCodeRow(
                    station_id=station.id, language_code_id=lc_map[lc].id
                )
                session.add(junction)

        await session.flush()
        await session.refresh(
            station,
            [
                "core_station",
                "tags_rel",
                "language_codes_rel",
                "country_rel",
                "state_rel",
                "codec_rel",
            ],
        )

        result_map[station.radio_id] = station

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
