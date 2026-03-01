from typing import List

from argon2 import PasswordHasher
from fastapi import Depends, APIRouter, HTTPException, Request
from logging import Logger

from sqlalchemy.ext.asyncio.session import AsyncSession

from backend.constants import BACKEND_URL
from backend.utils.logger import getLogger
from backend.core.aResult import AResult

from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from backend.core.middlewares.authMiddleware import AuthMiddleware

from backend.core.access.db.ormModels.user import UserRow
from backend.core.access.db.ormModels.user_album import UserAlbumRow

from backend.core.framework.user.user import User

from backend.core.responses.libraryListsResponse import LibraryListsResponse
from backend.core.responses.okResponse import OkResponse
from backend.core.responses.queueResponse import QueueResponse
from backend.core.responses.sessionResponse import SessionResponse
from backend.core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse

ph = PasswordHasher(
    time_cost=2,
    memory_cost=19456,
    parallelism=1,
)

logger: Logger = getLogger(name=__name__)
router = APIRouter(
    prefix="/user", dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)]
)


@router.get("/session")
async def get_session(request: Request) -> SessionResponse:
    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request)

    if a_result_user.is_not_ok():
        logger.error("Error getting current user.")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    image: str | None = a_result_user.result().image

    if image:
        image = BACKEND_URL + "/image/" + image

    return SessionResponse(
        username=a_result_user.result().username,
        image=image,
        admin=a_result_user.result().admin,
    )


@router.get(path="/queue")
def get_queue(request: Request) -> QueueResponse:
    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    a_result_queue: AResult[QueueResponse] = User.get_user_queue(
        user_id=a_result_user.result().id
    )
    if a_result_queue.is_not_ok():
        logger.error(f"Error getting user queue. {a_result_queue.info()}")
        raise HTTPException(
            status_code=a_result_queue.get_http_code(), detail=a_result_queue.message()
        )

    return a_result_queue.result()


@router.get(path="/library/lists")
def get_library_lists(request: Request) -> LibraryListsResponse:

    return LibraryListsResponse(albums=[], playlists=[])


@router.get(path="/library/albums")
async def get_user_albums(request: Request) -> List[BaseAlbumWithSongsResponse]:
    """Get all albums in the user's library."""

    session: AsyncSession = DBSessionMiddleware.get_session(request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    a_result_albums: AResult[List[BaseAlbumWithSongsResponse]] = (
        await User.get_user_albums(session, user_id=a_result_user.result().id)
    )

    if a_result_albums.is_not_ok():
        logger.error(f"Error getting user albums. {a_result_albums.info()}")
        raise HTTPException(
            status_code=a_result_albums.get_http_code(),
            detail=a_result_albums.message(),
        )

    return a_result_albums.result()


@router.post(path="/library/album/{album_public_id}")
async def add_album_to_library(request: Request, album_public_id: str) -> OkResponse:
    """Add an album to the user's library."""

    session: AsyncSession = DBSessionMiddleware.get_session(request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    a_result: AResult[UserAlbumRow] = await User.add_album_to_library(
        session=session,
        user_id=a_result_user.result().id,
        album_public_id=album_public_id,
    )
    if a_result.is_not_ok():
        logger.error(f"Error adding album to library. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse()


@router.delete(path="/library/album/{album_public_id}")
async def remove_album_from_library(
    request: Request, album_public_id: str
) -> OkResponse:
    """Remove an album from the user's library."""

    session: AsyncSession = DBSessionMiddleware.get_session(request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    a_result: AResult[bool] = await User.remove_album_from_library(
        session=session,
        user_id=a_result_user.result().id,
        album_public_id=album_public_id,
    )
    if a_result.is_not_ok():
        logger.error(f"Error removing album from library. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse()
