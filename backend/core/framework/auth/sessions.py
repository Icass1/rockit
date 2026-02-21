import uuid
from logging import Logger
from fastapi import Response
from datetime import timedelta, datetime, timezone

from backend.core.aResult import AResult, AResultCode
from backend.core.access.sessionAccess import SessionAccess
from backend.core.access.db.ormModels.session import SessionRow

from backend.constants import ENVIRONMENT, SESSION_DURATION, SESSION_COOKIE
from backend.utils.logger import getLogger


logger: Logger = getLogger(name=__name__)


class Session:
    @staticmethod
    async def create_session_async(response: Response, user_id: int) -> AResultCode:
        session_id = str(uuid.uuid4())
        expires_at: datetime = datetime.now(
            tz=timezone.utc) + timedelta(seconds=SESSION_DURATION)

        a_result_sesion: AResult[SessionRow] = await SessionAccess.create_session_async(
            session_id=session_id, user_id=user_id, expires_at=expires_at)
        if a_result_sesion.is_not_ok():
            logger.error(f"Error creating session {a_result_sesion.info()}")
            return AResultCode(code=a_result_sesion.code(), message=a_result_sesion.message())

        if ENVIRONMENT == "DEV":
            secure = False
        elif ENVIRONMENT == "PROD":
            secure = True
        else:
            raise Exception(f"ENVIRONMENT is not DEV or PROD, {ENVIRONMENT=}")

        response.set_cookie(
            key=SESSION_COOKIE,
            value=session_id,
            httponly=True,
            max_age=SESSION_DURATION,
            samesite="lax",
            secure=secure
        )

        return AResultCode(code=AResultCode.OK, message="OK")

    @staticmethod
    async def get_user_id_from_session_async(session_id: str) -> AResult[SessionRow]:
        a_result_session: AResult[SessionRow] = await SessionAccess.get_session_from_id_async(
            session_id=session_id)

        if a_result_session.is_not_ok():
            logger.error(
                f"Error getting session from id. {a_result_session.info()}")
            return AResult[SessionRow](code=a_result_session.code(), message=a_result_session.message())

        return AResult[SessionRow](code=AResultCode.OK, message=a_result_session.message(), result=a_result_session.result())

    @staticmethod
    async def end_session_async(session_id: str) -> AResultCode:
        a_result_code: AResultCode = await SessionAccess.disable_session_from_session_id_async(
            session_id=session_id)

        if a_result_code.is_not_ok():
            logger.error("Error disabling session from id.")
            return a_result_code

        return a_result_code
