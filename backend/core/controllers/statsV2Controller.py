from fastapi import Depends, APIRouter, Request, HTTPException
from logging import Logger

from backend.core.responses.userStatsV2Response import UserStatsV2Response
from backend.core.requests.userStatsRequest import UserStatsRequest
from backend.core.middlewares.authMiddleware import AuthMiddleware
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware

from backend.core.framework.statsV2 import StatsV2
from backend.utils.logger import getLogger

logger: Logger = getLogger(name=__name__)
router = APIRouter(
    prefix="/stats/v2",
    dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)],
    tags=["Core", "Stats", "V2"],
)


@router.post("/user")
async def get_user_stats_v2(
    request: Request,
    body: UserStatsRequest,
) -> UserStatsV2Response:
    """Get user listening statistics (v2) using listen interval data for accurate ms-based calculations."""

    session = DBSessionMiddleware.get_session(request=request)
    a_result_user = AuthMiddleware.get_current_user(request=request)

    if a_result_user.is_not_ok():
        raise HTTPException(status_code=401, detail="User not authenticated")

    a_result = await StatsV2.get_user_stats_async(
        session=session,
        user_id=a_result_user.result().id,
        range_value=body.range,
        custom_start=body.start,
        custom_end=body.end,
    )

    if a_result.is_not_ok():
        raise HTTPException(status_code=400, detail=a_result.message())

    return a_result.result()
