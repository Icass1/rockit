from typing import List

from fastapi import Depends, APIRouter, HTTPException, Request
from logging import Logger

from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult
from backend.core.responses.okResponse import OkResponse
from backend.utils.logger import getLogger

from backend.core.middlewares.authMiddleware import AuthMiddleware
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware

from backend.core.access.db.ormModels.user import UserRow

from backend.core.framework.userSong.userSong import UserSong

logger: Logger = getLogger(__name__)
router = APIRouter(
    prefix="/like", dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)]
)


@router.put("/song/{song_public_id}")
async def toggle_like(request: Request, song_public_id: str) -> OkResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    a_result: AResult[OkResponse] = await UserSong.toggle_like(
        session=session,
        user_id=a_result_user.result().id,
        song_public_id=song_public_id,
    )
    if a_result.is_not_ok():
        logger.error(f"Error toggling like. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.get("")
async def get_liked_songs(request: Request) -> List[str]:
    session: AsyncSession = DBSessionMiddleware.get_session(request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    a_result: AResult[List[str]] = await UserSong.get_liked_songs(
        session=session, user_id=a_result_user.result().id
    )
    if a_result.is_not_ok():
        logger.error(f"Error getting liked songs. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()
