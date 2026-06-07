from logging import Logger
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.core.aResult import AResult

from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from backend.core.middlewares.authMiddleware import AuthMiddleware

from backend.core.responses.baseStationResponse import BaseStationResponse

from backend.radioBrowser.framework.radio import Radio

logger: Logger = getLogger(__name__)

router = APIRouter(
    prefix="/radio",
    dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)],
    tags=["Radio"],
)


@router.get("/station/{public_id}")
async def get_station(request: Request, public_id: str) -> BaseStationResponse:
    """Get a radio station by its public_id."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result: AResult[BaseStationResponse] = (
        await Radio.get_station_from_public_id_async(
            session=session, public_id=public_id
        )
    )
    if a_result.is_not_ok():
        logger.error("TODO")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.get("/stations/geo")
async def get_stations_with_geo(
    request: Request,
    limit: int = Query(default=1000, ge=1, le=10000),
    offset: int = Query(default=0, ge=0),
) -> List[BaseStationResponse]:
    """Get radio stations that have geographic coordinates."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result: AResult[List[BaseStationResponse]] = (
        await Radio.get_stations_with_geo_async(
            session=session, limit=limit, offset=offset
        )
    )
    if a_result.is_not_ok():
        logger.error("TODO")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.get("/stations/by-country/{country}")
async def get_stations_by_country(
    request: Request,
    country: str,
) -> List[BaseStationResponse]:
    """Get radio stations by country (fetches from Radio Browser API)."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result: AResult[List[BaseStationResponse]] = (
        await Radio.get_stations_by_country_async(
            session=session,
            country=country,
        )
    )
    if a_result.is_not_ok():
        logger.error("TODO")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()
