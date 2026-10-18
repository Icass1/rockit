import uuid
from logging import Logger
from fastapi import Response
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import timedelta, datetime, timezone
from jose import jwt, JOSEError
from pydantic import ValidationError

from backend.utils.logger import getLogger
from backend.constants import (
    ENVIRONMENT,
    SESSION_DURATION,
    SESSION_COOKIE,
    PROD_WEB_SESSION_DOMAIN,
    PROD_MOBILE_SESSION_DOMAIN,
    SESSION_DURATION_REMEMBER_ME,
    SESSION_TOKEN_SECRET,
)

from backend.core.aResult import AResult, AResultCode

from backend.core.enums.platformEnum import PlatformEnum

from backend.core.access.sessionAccess import SessionAccess
from backend.core.access.db.ormModels.session import SessionRow
from backend.core.framework.models.sessionTokenClaims import SessionTokenClaims

logger: Logger = getLogger(name=__name__)


class Session:
    @staticmethod
    async def create_session_async(
        session: AsyncSession,
        response: Response,
        platform: PlatformEnum,
        user_id: int,
        user_public_id: str,
        rembember_me: bool,
        ip: str | None,
    ) -> AResult[str]:
        """Create a signed JWT and persist it for session revocation."""

        session_duration = SESSION_DURATION

        if rembember_me:
            session_duration = SESSION_DURATION_REMEMBER_ME

        created_at = datetime.now(tz=timezone.utc)
        expires_at: datetime = created_at + timedelta(seconds=session_duration)
        try:
            claims = SessionTokenClaims(
                iat=int(created_at.timestamp()),
                exp=int(expires_at.timestamp()),
                sub=user_public_id,
                jti=str(uuid.uuid4()),
                platform=platform.name,
                ip=ip,
            )
            session_id = jwt.encode(
                claims=claims.model_dump(),
                key=SESSION_TOKEN_SECRET,
                algorithm="HS256",
            )
        except (JOSEError, ValidationError):
            logger.error("Failed to create session token.")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Failed to create session token.",
            )

        a_result_sesion: AResult[SessionRow] = await SessionAccess.create_session_async(
            session=session,
            session_id=session_id,
            user_id=user_id,
            expires_at=expires_at,
            platform=platform,
            ip=ip,
        )
        if a_result_sesion.is_not_ok():
            logger.error(f"Error creating session {a_result_sesion.info()}")
            return AResult(
                code=a_result_sesion.code(),
                message=a_result_sesion.message(),
            )

        if ENVIRONMENT == "DEV":
            secure = False
        elif ENVIRONMENT == "PROD":
            secure = True
        else:
            logger.error("Invalid session environment configuration.")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Invalid session environment configuration.",
            )

        domain = None
        if ENVIRONMENT == "PROD":
            if platform == PlatformEnum.WEB:
                domain = PROD_WEB_SESSION_DOMAIN
            elif platform == PlatformEnum.MOBILE:
                domain = PROD_MOBILE_SESSION_DOMAIN

        response.set_cookie(
            key=SESSION_COOKIE,
            value=session_id,
            httponly=True,
            max_age=session_duration,
            samesite="lax",
            secure=secure,
            domain=domain,
        )

        return AResult(code=AResultCode.OK, message="OK", result=session_id)

    @staticmethod
    async def get_user_id_from_session_async(
        session: AsyncSession, session_id: str
    ) -> AResult[SessionRow]:
        """Validate signed or legacy sessions for HTTP and WebSocket clients."""

        try:
            if "." in session_id:
                claims = SessionTokenClaims.model_validate(
                    obj=jwt.decode(
                        token=session_id,
                        key=SESSION_TOKEN_SECRET,
                        algorithms=["HS256"],
                        options={
                            "require_iat": True,
                            "require_exp": True,
                            "require_sub": True,
                            "require_jti": True,
                        },
                    )
                )
                now = int(datetime.now(tz=timezone.utc).timestamp())
                if claims.iat > now or claims.exp <= now or claims.exp <= claims.iat:
                    logger.warning("Invalid session token timestamps.")
                    return AResult(
                        code=AResultCode.NOT_FOUND, message="Invalid session."
                    )
            else:
                # Existing UUID sessions remain valid until expiry or revocation.
                uuid.UUID(hex=session_id)
        except (JOSEError, ValidationError, ValueError, TypeError):
            logger.warning("Invalid or expired session token.")
            return AResult(code=AResultCode.NOT_FOUND, message="Invalid session.")

        a_result_session: AResult[SessionRow] = (
            await SessionAccess.get_session_from_id_async(
                session=session, session_id=session_id
            )
        )

        if a_result_session.is_not_ok():
            logger.error(f"Error getting session. {a_result_session.info()}")
            return AResult[SessionRow](
                code=a_result_session.code(), message=a_result_session.message()
            )

        session_row = a_result_session.result()
        if session_row.disabled or session_row.expires_at <= datetime.now(
            tz=timezone.utc
        ):
            logger.warning("Session is disabled or expired.")
            return AResult(code=AResultCode.NOT_FOUND, message="Invalid session.")

        return AResult[SessionRow](
            code=AResultCode.OK,
            message=a_result_session.message(),
            result=session_row,
        )

    @staticmethod
    async def end_session_async(session: AsyncSession, session_id: str) -> AResultCode:
        """Revoke the stored session, including signed tokens."""
        a_result_code: AResultCode = (
            await SessionAccess.disable_session_from_session_id_async(
                session=session, session_id=session_id
            )
        )

        if a_result_code.is_not_ok():
            logger.error("Error disabling session from id.")
            return a_result_code

        return a_result_code
