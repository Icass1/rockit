from argon2 import PasswordHasher
from fastapi import Depends, APIRouter, HTTPException, Request
from logging import Logger

from backend.core.aResult import AResult
from backend.core.access.db.ormModels.main.user import UserRow
from backend.core.middlewares.authMiddleware import AuthMiddleware
from backend.utils.logger import getLogger
from backend.core.framework.user.user import User

from backend.core.responses.libraryListsResponse import LibraryListsResponse
from backend.core.responses.queueResponse import QueueResponse
from backend.core.responses.sessionResponse import SessionResponse


ph = PasswordHasher(
    time_cost=2,
    memory_cost=19456,
    parallelism=1,
)

logger: Logger = getLogger(name=__name__)
router = APIRouter(
    prefix="/user",
    dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)]
)


@router.get("/session")
async def get_session(request: Request) -> SessionResponse:
    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request)

    if a_result_user.is_not_ok():
        logger.error("Error getting current user.")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message())

    return SessionResponse(username=a_result_user.result().username, image=a_result_user.result().image, admin=a_result_user.result().admin)


@router.get(path="/queue")
def get_queue(request: Request) -> QueueResponse:
    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        logger.error("Error getting current user.")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message())

    return User.get_user_queue(user_id=a_result_user.result().id)


@router.get(path="/library/lists")
def get_library_lists(request: Request) -> LibraryListsResponse:

    return LibraryListsResponse(albums=[], playlists=[])
