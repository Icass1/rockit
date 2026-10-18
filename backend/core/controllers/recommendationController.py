from fastapi import APIRouter, Depends, HTTPException, Request

from backend.core.framework.recommendation import Recommendation
from backend.core.middlewares.authMiddleware import AuthMiddleware
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from backend.core.requests.recommendationsRequest import RecommendationsRequest
from backend.core.responses.recommendationsResponse import RecommendationsResponse
from backend.utils.logger import getLogger

logger = getLogger(__name__)
router = APIRouter(
    prefix="/recommendations",
    tags=["Core", "Recommendations"],
    dependencies=[Depends(AuthMiddleware.auth_dependency)],
)


@router.post("")
async def get_recommendations(
    request: Request, body: RecommendationsRequest
) -> RecommendationsResponse:
    """Authenticated, bounded recommendations; external username is opt-in."""
    user = AuthMiddleware.get_current_user(request=request)
    if user.is_not_ok():
        logger.error("Recommendation authentication failed")
        raise HTTPException(status_code=user.get_http_code(), detail=user.message())
    result = await Recommendation.get_async(
        session=DBSessionMiddleware.get_session(request=request),
        user_id=user.result().id,
        limit=body.limit,
        external_username=body.externalUsername,
        current_public_id=body.currentPublicId,
    )
    if result.is_not_ok():
        logger.error("Recommendation request failed")
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())
    return result.result()
