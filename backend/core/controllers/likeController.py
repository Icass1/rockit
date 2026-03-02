from typing import List

from fastapi import Depends, APIRouter, HTTPException, Request
from logging import Logger
from pydantic import BaseModel

from sqlalchemy.ext.asyncio.session import AsyncSession

from backend.core.aResult import AResult
from backend.core.access.db.ormModels.user_liked_media import UserLikedMediaRow
from backend.utils.logger import getLogger

from backend.core.middlewares.authMiddleware import AuthMiddleware
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware

from backend.core.access.db.ormModels.user import UserRow

from backend.core.framework.user.user import User

from backend.core.responses.okResponse import OkResponse


class LikeSongsRequest(BaseModel):
    song_public_ids: List[str]


logger: Logger = getLogger(name=__name__)
router = APIRouter(
    prefix="/like",
    dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)],
)


@router.put(path="/song/{song_public_id}")
async def like_song(request: Request, song_public_id: str) -> OkResponse:
    """Like a single song."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    a_result: AResult[UserLikedMediaRow] = await User.like_song(
        session=session,
        user_id=a_result_user.result().id,
        song_public_id=song_public_id,
    )
    if a_result.is_not_ok():
        logger.error(f"Error liking song. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse()


@router.delete(path="/song/{song_public_id}")
async def unlike_song(request: Request, song_public_id: str) -> OkResponse:
    """Unlike a single song."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    a_result: AResult[bool] = await User.unlike_song(
        session=session,
        user_id=a_result_user.result().id,
        song_public_id=song_public_id,
    )
    if a_result.is_not_ok():
        logger.error(f"Error unliking song. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse()


@router.put(path="/album/{album_public_id}")
async def like_album(request: Request, album_public_id: str) -> OkResponse:
    """Like all songs in an album."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    a_result: AResult[List[UserLikedMediaRow]] = await User.like_album(
        session=session,
        user_id=a_result_user.result().id,
        album_public_id=album_public_id,
    )
    if a_result.is_not_ok():
        logger.error(f"Error liking album. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse()


@router.delete(path="/album/{album_public_id}")
async def unlike_album(request: Request, album_public_id: str) -> OkResponse:
    """Unlike all songs in an album."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    a_result: AResult[int] = await User.unlike_album(
        session=session,
        user_id=a_result_user.result().id,
        album_public_id=album_public_id,
    )
    if a_result.is_not_ok():
        logger.error(f"Error unliking album. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse()


@router.post(path="/songs")
async def like_songs(request: Request, body: LikeSongsRequest) -> OkResponse:
    """Like multiple songs by their public IDs."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    a_result: AResult[List[UserLikedMediaRow]] = await User.like_songs(
        session=session,
        user_id=a_result_user.result().id,
        song_public_ids=body.song_public_ids,
    )
    if a_result.is_not_ok():
        logger.error(f"Error liking songs. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse()


@router.delete(path="/songs")
async def unlike_songs(request: Request, body: LikeSongsRequest) -> OkResponse:
    """Unlike multiple songs by their public IDs."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    a_result: AResult[int] = await User.unlike_songs(
        session=session,
        user_id=a_result_user.result().id,
        song_public_ids=body.song_public_ids,
    )
    if a_result.is_not_ok():
        logger.error(f"Error unliking songs. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse()


@router.get(path="/songs")
async def get_liked_songs(request: Request) -> List[str]:
    """Get all liked song public IDs."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    a_result: AResult[List[str]] = await User.get_user_liked_song_public_ids(
        session=session,
        user_id=a_result_user.result().id,
    )
    if a_result.is_not_ok():
        logger.error(f"Error getting liked songs. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()
