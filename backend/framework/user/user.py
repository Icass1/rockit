from fastapi import HTTPException, Request

from backend.access.userAccess import UserAccess
from backend.framework.auth.sessions import get_user_id_from_session
from backend.db.ormModels.main.user import UserRow
from backend.constants import SESSION_COOKIE
from backend.responses.queueResponse import QueueResponse


class User:

    @staticmethod
    def auth_dependency(request: Request):
        session_id = request.cookies.get(SESSION_COOKIE)
        if not session_id:
            raise HTTPException(401, "Not logged in")

        user_id = get_user_id_from_session(session_id)
        if not user_id:
            raise HTTPException(401, "Session expired")

        user = UserAccess.get_user_from_id(user_id)
        if not user:
            raise HTTPException(404, "User not found")

        request.state.user = user
        request.state.session_id = session_id

    @staticmethod
    def get_user_from_session(request: Request) -> UserRow:
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

    @staticmethod
    def get_current_user(request: Request) -> UserRow:
        return request.state.user

    @staticmethod
    def get_current_session_id(request: Request) -> str:
        return request.state.session_id

    @staticmethod
    def get_user_queue(user_id: int) -> QueueResponse:

        return UserAccess.get_queue(user_id)

    @staticmethod
    def logout(session_id: str):
        UserAccess.end_session(session_id)