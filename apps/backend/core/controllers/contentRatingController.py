from fastapi import APIRouter, Depends, HTTPException, Request

from core.framework.contentRating import ContentRatings
from core.middlewares.authMiddleware import AuthMiddleware
from core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from core.requests.contentRatingRequest import (
    ContentRatingBackfillRequest,
    ContentRatingLookupRequest,
    UpdateContentRatingRequest,
)
from core.responses.contentRatingResponse import (
    ContentRatingBackfillResponse,
    ContentRatingLookupResponse,
)
from core.responses.okResponse import OkResponse
from logger import getLogger

logger = getLogger(__name__)
router = APIRouter(prefix="/content-rating", tags=["Core", "Content rating"])


@router.post("/lookup", dependencies=[Depends(AuthMiddleware.auth_dependency)])
async def lookup_content_ratings(
    request: Request, payload: ContentRatingLookupRequest
) -> ContentRatingLookupResponse:
    result = await ContentRatings.lookup_async(
        session=DBSessionMiddleware.get_session(request=request), public_ids=payload.publicIds
    )
    if result.is_not_ok():
        logger.error("Content rating lookup failed: %s", result.info())
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())
    return result.result()


@router.post("/backfill", dependencies=[Depends(AuthMiddleware.admin_dependency)])
async def backfill_content_ratings(
    request: Request, payload: ContentRatingBackfillRequest
) -> ContentRatingBackfillResponse:
    result = await ContentRatings.backfill_async(
        session=DBSessionMiddleware.get_session(request=request),
        after=payload.after,
        limit=payload.limit,
    )
    if result.is_not_ok():
        logger.error("Content rating backfill failed: %s", result.info())
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())
    return result.result()


@router.post("/{public_id}", dependencies=[Depends(AuthMiddleware.admin_dependency)])
async def update_content_rating(
    request: Request, public_id: str, payload: UpdateContentRatingRequest
) -> OkResponse:
    result = await ContentRatings.record_async(
        session=DBSessionMiddleware.get_session(request=request),
        public_id=public_id,
        value=True if payload.value == "explicit" else False if payload.value == "clean" else None,
        source="manual",
        manual=True,
    )
    if result.is_not_ok():
        logger.error("Content rating update failed: %s", result.info())
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())
    return OkResponse()
