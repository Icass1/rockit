from fastapi import Depends, APIRouter, Request
from logging import Logger

from backend.core.responses.homeStatsResponse import HomeStatsResponse
from backend.utils.logger import getLogger

from backend.core.middlewares.authMiddleware import AuthMiddleware

logger: Logger = getLogger(name=__name__)
router = APIRouter(
    prefix="/stats",
    dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)]
)


@router.get("/home")
async def get_home_stats(request: Request) -> HomeStatsResponse:
    """Get stats for the home page."""

    return HomeStatsResponse(
        nostalgicMix=[],
        songsByTimePlayed=[],
        randomSongsLastMonth=[],
        hiddenGems=[],
        communityTop=[],
        monthlyTop=[],
        moodSongs=[])
