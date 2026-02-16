
from datetime import datetime, timezone

from fastapi import HTTPException, Request

from backend.db.ormModels.main.session import SessionRow
from backend.db.ormModels.main.user import UserRow
from backend.aResult import AResult, AResultCode
from backend.access.userAccess import UserAccess
from backend.constants import SESSION_COOKIE
from backend.framework.auth.sessions import Session
from backend.utils.logger import getLogger


logger = getLogger(__name__)


class AuthMiddleware:
    @staticmethod
    def auth_dependency(request: Request) -> None:
        session_id: str | None = request.cookies.get(SESSION_COOKIE)
        if not session_id:
            raise HTTPException(status_code=401, detail="Not logged in.")

        a_result_session: AResult[SessionRow] = Session.get_user_id_from_session(
            session_id=session_id)
        if a_result_session.is_not_ok():
            raise HTTPException(
                status_code=a_result_session.get_http_code(), detail=a_result_session.message())

        if a_result_session.result().expires_at < datetime.now(timezone.utc):
            raise HTTPException(401, "Session has expired.")

        if a_result_session.result().disabled:
            raise HTTPException(401, "Session is disabled.")

        user: UserRow | None = UserAccess.get_user_from_id(
            user_id=a_result_session.result().user_id)
        if not user:
            raise HTTPException(404, "User not found.")

        request.state.user = user
        request.state.session_id = session_id

    @staticmethod
    def get_current_user(request: Request) -> AResult[UserRow]:
        try:
            return AResult(code=AResultCode.OK, message="OK", result=request.state.user)
        except:
            logger.error("User not in request state")
            return AResult(AResultCode.GENERAL_ERROR, message="User not in request state")

    @staticmethod
    def get_current_session_id(request: Request) -> AResult[str]:
        try:
            return AResult(code=AResultCode.OK, message="OK", result=request.state.session_id)
        except:
            logger.error("Session id not in request state")
            return AResult(AResultCode.GENERAL_ERROR, message="Session id not in request state")
