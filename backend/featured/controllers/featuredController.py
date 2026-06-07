from logging import Logger
from fastapi import APIRouter, Depends, HTTPException, Request

from backend.utils.logger import getLogger

from backend.core.aResult import AResult

from backend.core.middlewares.authMiddleware import AuthMiddleware
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware

from backend.core.access.db.ormModels.user import UserRow

from backend.core.responses.basePlaylistWithMediasResponse import (
    BasePlaylistWithMediasResponse,
)

from backend.featured.framework import featured

logger: Logger = getLogger(__name__)
router = APIRouter(
    prefix="/featured",
    tags=["Core", "Featured"],
    dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)],
)


@router.get("/liked")
async def get_featured_liked(
    request: Request,
) -> BasePlaylistWithMediasResponse:
    """Get the user's liked songs as a playlist."""

    session = DBSessionMiddleware.get_session(request=request)
    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        raise HTTPException(status_code=401, detail="User not authenticated")

    a_result = await featured.get_liked_playlist_async(
        session=session,
        user_id=a_result_user.result().id,
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.get("/most-listened")
async def get_featured_most_listened(
    request: Request,
) -> BasePlaylistWithMediasResponse:
    """Get the user's most listened songs as a playlist."""

    session = DBSessionMiddleware.get_session(request=request)
    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        raise HTTPException(status_code=401, detail="User not authenticated")

    a_result = await featured.get_most_listened_playlist_async(
        session=session,
        user_id=a_result_user.result().id,
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.get("/recent-mix")
async def get_featured_recent_mix(
    request: Request,
) -> BasePlaylistWithMediasResponse:
    """Get the user's recently played songs as a playlist."""

    session = DBSessionMiddleware.get_session(request=request)
    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        raise HTTPException(status_code=401, detail="User not authenticated")

    a_result = await featured.get_recent_mix_playlist_async(
        session=session,
        user_id=a_result_user.result().id,
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.get("/last-month")
async def get_featured_last_month(
    request: Request,
) -> BasePlaylistWithMediasResponse:
    """Get the user's last month top songs as a playlist."""

    session = DBSessionMiddleware.get_session(request=request)
    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        raise HTTPException(status_code=401, detail="User not authenticated")

    a_result = await featured.get_last_month_playlist_async(
        session=session,
        user_id=a_result_user.result().id,
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.get("/year-recap")
async def get_featured_year_recap(
    request: Request,
) -> BasePlaylistWithMediasResponse:
    """Get the user's last year top songs as a playlist."""

    session = DBSessionMiddleware.get_session(request=request)
    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        raise HTTPException(status_code=401, detail="User not authenticated")

    a_result = await featured.get_year_recap_playlist_async(
        session=session,
        user_id=a_result_user.result().id,
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()
