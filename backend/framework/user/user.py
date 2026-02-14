from fastapi import HTTPException, Request

from backend.access.userAccess import UserAccess
from backend.framework.auth.sessions import get_user_id_from_session
from backend.db.ormModels.main.user import UserRow
from backend.constants import SESSION_COOKIE
from backend.responses.queueResponse import QueueResponse


def get_current_user(request: Request) -> UserRow:
    session_id: str | None = request.cookies.get(SESSION_COOKIE)

    if not session_id:
        raise HTTPException(status_code=401, detail="Not logged in")

    user_id: int | None = get_user_id_from_session(session_id=session_id)
    if not user_id:
        raise HTTPException(status_code=401, detail="Session expired")

    user: UserRow | None = UserAccess.get_user_from_id(user_id=user_id)

    if not user:
        raise HTTPException(
            status_code=404, detail="User not found in database")

    return user


def get_user_queue(user_id: int) -> QueueResponse:

    return UserAccess.get_queue(user_id)
