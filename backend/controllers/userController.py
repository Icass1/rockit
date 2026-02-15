from argon2 import PasswordHasher
from fastapi import Depends, HTTPException, APIRouter
from logging import Logger

from backend.db.ormModels.main.user import UserRow

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

logger: Logger = getLogger(__name__)
router = APIRouter(prefix="/user")


@router.get("/session")
async def get_session(user: UserRow = Depends(dependency=User.get_current_user)) -> SessionResponse:
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return SessionResponse(username=user.username, image=user.image, admin=user.admin)


@router.get(path="/queue")
def get_queue(user: UserRow = Depends(dependency=User.get_current_user)) -> QueueResponse:
    return User.get_user_queue(user_id=user.id)


@router.get(path="/library/lists")
def get_library_lists(user: UserRow = Depends(dependency=User.get_current_user)) -> LibraryListsResponse:

    return LibraryListsResponse(albums=[], playlists=[])
