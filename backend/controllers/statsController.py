from fastapi import Depends, HTTPException, APIRouter
from logging import Logger

from backend.db.ormModels.main.user import UserRow

from backend.framework.user.user import User
from backend.responses.homeStatsResponse import HomeStatsResponse
from backend.utils.logger import getLogger

logger: Logger = getLogger(__name__)
router = APIRouter(prefix="/stats")


@router.get("/home")
async def me(user: UserRow = Depends(dependency=User.get_user_from_session)) -> HomeStatsResponse:
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return HomeStatsResponse(songsByTimePlayed=[], nostalgicMix=[], hiddenGems=[], communityTop=[], monthlyTop=[], moodSongs=[], randomSongsLastMonth=[])
