from logging import Logger

from fastapi import APIRouter, Depends, HTTPException, Request

from core.aResult import AResult
from core.framework.models.recommendation import SeedTrack
from core.framework.recommendation import Recommendation, RecommendationResult
from core.framework.recommendationPrefetch import RecommendationPrefetch
from core.middlewares.authMiddleware import AuthMiddleware
from core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from core.requests.prepareRecommendationsRequest import (
    PrepareRecommendationsRequest,
)
from core.responses.songListResponse import SongListResponse
from logger import getLogger

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
    external: bool = True,
) -> SongListResponse:
    """Personalized song recommendations from the current user's listening profile."""

    session = DBSessionMiddleware.get_session(request=request)
    a_result_user = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        logger.warning(f"Unauthenticated recommendation request. {a_result_user.info()}")
        raise HTTPException(status_code=401, detail="User not authenticated")

    a_result: AResult[
        RecommendationResult
    ] = await Recommendation.get_recommendations_for_user_async(
        session=session,
        user_id=a_result_user.result().id,
        limit=limit,
        include_external=external,
    )
    if a_result.is_not_ok():
        logger.error(f"Error getting recommendations for you. {a_result.info()}")
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    return Recommendation.to_song_list_response(result=a_result.result())


@router.get("/playlist/{public_id}")
async def get_recommendations_for_playlist(
    request: Request,
    public_id: str,
    limit: int = 20,
    external: bool = True,
) -> SongListResponse:
    """Song suggestions to add to a playlist, based on what's already in it."""

    session = DBSessionMiddleware.get_session(request=request)
    a_result_user = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        logger.warning(f"Unauthenticated recommendation request. {a_result_user.info()}")
        raise HTTPException(status_code=401, detail="User not authenticated")

    a_result: AResult[
        RecommendationResult
    ] = await Recommendation.get_recommendations_for_playlist_async(
        session=session,
        user_id=a_result_user.result().id,
        playlist_public_id=public_id,
        limit=limit,
        include_external=external,
    )
    if a_result.is_not_ok():
        logger.error(f"Error getting recommendations for playlist {public_id}. {a_result.info()}")
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    return Recommendation.to_song_list_response(result=a_result.result())


@router.post("/prepare")
async def prepare_recommendations(
    request: Request,
    payload: PrepareRecommendationsRequest,
) -> SongListResponse:
    """Prepare only the next two recommendations during active playback."""
    session = DBSessionMiddleware.get_session(request=request)
    user = AuthMiddleware.get_current_user(request=request)
    if user.is_not_ok():
        logger.error(f"Unauthenticated recommendation preparation. {user.info()}")
        raise HTTPException(status_code=401, detail="User not authenticated")
    prepared = await RecommendationPrefetch.prepare_async(
        session=session,
        user_id=user.result().id,
        public_ids=payload.publicIds,
        discover=[
            SeedTrack(artist_name=item.artist, track_name=item.track) for item in payload.discover
        ],
    )
    if prepared.is_not_ok():
        logger.error(f"Could not prepare recommendations. {prepared.info()}")
        raise HTTPException(status_code=prepared.get_http_code(), detail=prepared.message())
    return prepared.result()
