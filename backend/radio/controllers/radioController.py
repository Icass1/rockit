from logging import Logger
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.core.aResult import AResult

from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from backend.core.middlewares.authMiddleware import AuthMiddleware

from backend.core.responses.baseStationResponse import BaseStationResponse

from backend.radio.framework.radio import Radio

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
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()
