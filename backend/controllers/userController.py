from argon2 import PasswordHasher
from fastapi import Depends, APIRouter, Request
from logging import Logger

from backend.responses.okResponse import OkResponse
from backend.utils.logger import getLogger
from backend.framework.user.user import User

from backend.responses.libraryListsResponse import LibraryListsResponse
from backend.responses.queueResponse import QueueResponse
from backend.responses.sessionResponse import SessionResponse


ph = PasswordHasher(
    time_cost=2,
    memory_cost=19456,
    parallelism=1,
)

logger: Logger = getLogger(name=__name__)
router = APIRouter(
    prefix="/user",
    dependencies=[Depends(dependency=User.auth_dependency)]
)


@router.get("/session")
async def get_session(request: Request) -> SessionResponse:
    user = User.get_current_user(request)

    return SessionResponse(username=user.username, image=user.image, admin=user.admin)


@router.get(path="/queue")
def get_queue(request: Request) -> QueueResponse:
    user = User.get_current_user(request)

    return User.get_user_queue(user_id=user.id)


@router.get(path="/library/lists")
def get_library_lists(request: Request) -> LibraryListsResponse:

    return LibraryListsResponse(albums=[], playlists=[])


@router.get(path="/logout")
def logout_user(request: Request) -> OkResponse:

    print(User.get_current_session_id(request))

    return OkResponse()
