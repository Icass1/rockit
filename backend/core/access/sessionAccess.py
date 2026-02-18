from datetime import datetime
from logging import Logger
from sqlalchemy import update
from sqlalchemy.future import select

from backend.core.aResult import AResult, AResultCode
from backend.core.access.db.ormModels.main.session import SessionRow
from backend.core.init import rockit_db
from backend.utils.logger import getLogger

logger: Logger = getLogger(name=__name__)


class SessionAccess:

    @staticmethod
    def create_session(session_id: str, user_id: int, expires_at: datetime) -> AResult[SessionRow]:
        try:
            with rockit_db.session_scope() as s:
                session = SessionRow(
                    session_id=session_id,
                    user_id=user_id,
                    expires_at=expires_at
                )

                s.add(session)
                s.commit()
                s.refresh(session)
                s.expunge(session)

                return AResult(
                    code=AResultCode.OK,
                    message="Session created successfully",
                    result=session)

        except Exception as e:
            return AResult(code=AResultCode.GENERAL_ERROR, message=f"Failed to create session: {e}")

    @staticmethod
    def get_session_from_id(session_id: str) -> AResult[SessionRow]:
        try:

            session = rockit_db.session_scope()

            with session as s:
                stmt = select(SessionRow).where(
                    SessionRow.session_id == session_id
                )
                result: SessionRow | None = s.execute(
                    stmt).scalar_one_or_none()

                if not result:
                    logger.error("Error ")
                    return AResult(
                        code=AResultCode.NOT_FOUND,
                        message="Session not found")

                s.expunge(result)
                return AResult(
                    code=AResultCode.OK,
                    message="Session retrieved successfully.",
                    result=result)

        except Exception as e:
            logger.error("Error ")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get session: {e}.")

    @staticmethod
    def disable_session_from_session_id(session_id: str) -> AResultCode:
        try:
            with rockit_db.session_scope() as s:
                stmt = (
                    update(SessionRow)
                    .where(SessionRow.session_id == session_id)
                    .values(disabled=True)
                )

                result = s.execute(stmt)

                if result.rowcount == 0:
                    return AResultCode(
                        code=AResultCode.NOT_FOUND,
                        message="Session not found")

                s.commit()
                return AResultCode(
                    code=AResultCode.OK,
                    message="Session disabled")

        except Exception as e:
            return AResultCode(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to disable session: {e}")
