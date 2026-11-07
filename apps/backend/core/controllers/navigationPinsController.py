from fastapi import APIRouter, Depends, HTTPException, Request

from core.framework.user.navigationPins import NavigationPins
from core.middlewares.authMiddleware import AuthMiddleware
from core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from core.requests.pinNavigationRequest import PinNavigationRequest
from core.responses.navigationPinsResponse import NavigationPinsResponse
from logger import getLogger

logger = getLogger(__name__)
router = APIRouter(
    prefix="/user/navigation/pins",
    tags=["Core", "Navigation"],
    dependencies=[Depends(AuthMiddleware.auth_dependency)],
)


@router.get("")
async def get_navigation_pins_async(request: Request) -> NavigationPinsResponse:
    """Get the current user's visible pinned shortcuts."""
    user = AuthMiddleware.get_current_user(request=request)
    if user.is_not_ok():
        logger.error(f"Navigation pins authentication failed: {user.info()}")
        raise HTTPException(status_code=user.get_http_code(), detail=user.message())
    result = await NavigationPins.list_async(
        session=DBSessionMiddleware.get_session(request=request), user_id=user.result().id
    )
    if result.is_not_ok():
        logger.error(f"Navigation pins request failed: {result.info()}")
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())
    return result.result()


@router.post("")
async def pin_navigation_media_async(
    request: Request, payload: PinNavigationRequest
) -> NavigationPinsResponse:
    """Pin an existing album, playlist or artist; duplicates are idempotent."""
    return await _update(request=request, public_id=payload.publicId, pinned=True)


@router.delete("/{public_id}")
async def unpin_navigation_media_async(request: Request, public_id: str) -> NavigationPinsResponse:
    """Remove a personal shortcut without modifying Library or the target."""
    return await _update(request=request, public_id=public_id, pinned=False)


async def _update(request: Request, public_id: str, pinned: bool) -> NavigationPinsResponse:
    user = AuthMiddleware.get_current_user(request=request)
    if user.is_not_ok():
        logger.error(f"Navigation pin authentication failed: {user.info()}")
        raise HTTPException(status_code=user.get_http_code(), detail=user.message())
    result = await NavigationPins.set_async(
        session=DBSessionMiddleware.get_session(request=request),
        user_id=user.result().id,
        public_id=public_id,
        pinned=pinned,
    )
    if result.is_not_ok():
        logger.error(f"Navigation pin request failed: {result.info()}")
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())
    return result.result()
