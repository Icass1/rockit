from logging import Logger
from fastapi import Depends, APIRouter, Request, HTTPException

from backend.utils.logger import getLogger

from backend.core.aResult import AResult

from backend.core.middlewares.authMiddleware import AuthMiddleware
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware

from backend.core.framework.recommendation import Recommendation, RecommendationResult

from backend.core.responses.songListResponse import SongListResponse

logger: Logger = getLogger(__name__)
router = APIRouter(
    prefix="/recommendation",
    dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)],
    tags=["Core", "Recommendation"],
)


@router.get("/for-you")
async def get_recommendations_for_you(
    request: Request,
    limit: int = 20,
) -> SongListResponse:
    """Personalized song recommendations from the current user's listening profile."""

    session = DBSessionMiddleware.get_session(request=request)
    a_result_user = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        raise HTTPException(status_code=401, detail="User not authenticated")

    a_result: AResult[RecommendationResult] = (
        await Recommendation.get_recommendations_for_user_async(
            session=session,
            user_id=a_result_user.result().id,
            limit=limit,
        )
    )
    if a_result.is_not_ok():
        logger.error(f"Error getting recommendations for you. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return SongListResponse(
        songs=a_result.result().songs, discover=a_result.result().discover
    )


@router.get("/playlist/{public_id}")
async def get_recommendations_for_playlist(
    request: Request,
    public_id: str,
    limit: int = 20,
) -> SongListResponse:
    """Song suggestions to add to a playlist, based on what's already in it."""

    session = DBSessionMiddleware.get_session(request=request)
    a_result_user = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        raise HTTPException(status_code=401, detail="User not authenticated")

    a_result: AResult[RecommendationResult] = (
        await Recommendation.get_recommendations_for_playlist_async(
            session=session,
            user_id=a_result_user.result().id,
            playlist_public_id=public_id,
            limit=limit,
        )
    )
    if a_result.is_not_ok():
        logger.error(
            f"Error getting recommendations for playlist {public_id}. {a_result.info()}"
        )
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return SongListResponse(
        songs=a_result.result().songs, discover=a_result.result().discover
    )
