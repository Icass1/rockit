import uuid
from fastapi import Response
from datetime import timedelta, datetime, timezone

from backend.access.sessionAccess import SessionAccess
from backend.db.ormModels.main.session import SessionRow

from backend.constants import ENVIRONMENT, SESSION_COOKIE, SESSION_DURATION


def create_session(response: Response, user_id: int) -> None:
    session_id = str(uuid.uuid4())
    expires_at: datetime = datetime.now(tz=timezone.utc) + timedelta(seconds=SESSION_DURATION)

    SessionAccess.create_session(session_id=session_id, user_id=user_id, expires_at=expires_at)

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


def get_user_id_from_session(session_id: str) -> int | None:
    session: None | SessionRow = SessionAccess.get_session_from_id(
        session_id=session_id)

    if not session:
        return None

    return session.user_id
