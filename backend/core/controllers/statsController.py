from fastapi import Depends, APIRouter, Request, Query, HTTPException
from logging import Logger

from backend.core.responses.userStatsResponse import UserStatsResponse
from backend.core.responses.homeStatsResponse import HomeStatsResponse
from backend.core.middlewares.authMiddleware import AuthMiddleware
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from backend.core.framework.stats import Stats
from backend.utils.logger import getLogger

logger: Logger = getLogger(name=__name__)
router = APIRouter(
    prefix="/stats",
    dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)],
    tags=["Core", "Stats"],
)


@router.get("/user")
async def get_user_stats(
    request: Request,
    range: str = Query(default="7d", description="Range: 7d, 30d, 1y, or custom"),
    start: str | None = Query(
        default=None, description="Start date for custom range (ISO format)"
    ),
    end: str | None = Query(
        default=None, description="End date for custom range (ISO format)"
    ),
) -> UserStatsResponse:
    """Get user listening statistics."""
    session = DBSessionMiddleware.get_session(request=request)
    a_result_user = AuthMiddleware.get_current_user(request=request)

    if a_result_user.is_not_ok():
        raise HTTPException(status_code=401, detail="User not authenticated")

    a_result = await Stats.get_user_stats_async(
        session=session,
        user_id=a_result_user.result().id,
        range_value=range,  # type: ignore
        custom_start=start,
        custom_end=end,
    )

    if a_result.is_not_ok():
        raise HTTPException(status_code=400, detail=a_result.message())

    return a_result.result()


@router.get("/home")
async def get_home_stats(
    request: Request,
) -> HomeStatsResponse:
    """Get home screen stats with recommended songs and playlists."""
    session = DBSessionMiddleware.get_session(request=request)
    a_result_user = AuthMiddleware.get_current_user(request=request)

    if a_result_user.is_not_ok():
        raise HTTPException(status_code=401, detail="User not authenticated")

    a_result = await Stats.get_home_stats_async(
        session=session,
        user_id=a_result_user.result().id,
    )

    if a_result.is_not_ok():
        raise HTTPException(status_code=400, detail=a_result.message())

    return a_result.result()
