from fastapi import Depends, HTTPException, APIRouter, Request
from logging import Logger

from backend.aResult import AResult
from backend.db.ormModels.main.user import UserRow

from backend.middleware.authMiddleware import AuthMiddleware
from backend.responses.homeStatsResponse import HomeStatsResponse
from backend.utils.logger import getLogger

logger: Logger = getLogger(__name__)
router = APIRouter(
    prefix="/stats", dependencies=[Depends(AuthMiddleware.auth_dependency)])


@router.get("/home")
async def session(request: Request) -> HomeStatsResponse:
    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request)

    if a_result_user.is_not_ok():
        raise HTTPException(status_code=a_result_user.code(),
                            detail=a_result_user.message())

    return HomeStatsResponse(songsByTimePlayed=[], nostalgicMix=[], hiddenGems=[], communityTop=[], monthlyTop=[], moodSongs=[], randomSongsLastMonth=[])
