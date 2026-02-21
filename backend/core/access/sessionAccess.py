from datetime import datetime
from logging import Logger
from typing import Tuple
from sqlalchemy import Result, Select, Update, update
from sqlalchemy.future import select

from backend.core.aResult import AResult, AResultCode
from backend.core.access.db.ormModels.session import SessionRow
from backend.core.access.db import rockit_db
from backend.utils.logger import getLogger

logger: Logger = getLogger(name=__name__)


class SessionAccess:

    @staticmethod
    async def create_session_async(session_id: str, user_id: int, expires_at: datetime) -> AResult[SessionRow]:
        try:
            async with rockit_db.session_scope_async() as s:
                session = SessionRow(
                    session_id=session_id,
                    user_id=user_id,
                    expires_at=expires_at
                )

                s.add(session)
                await s.commit()
                await s.refresh(session)
                s.expunge(session)

                return AResult(
                    code=AResultCode.OK,
                    message="Session created successfully",
                    result=session)

        except Exception as e:
            return AResult(code=AResultCode.GENERAL_ERROR, message=f"Failed to create session: {e}")

    @staticmethod
    async def get_session_from_id_async(session_id: str) -> AResult[SessionRow]:
        try:
            async with rockit_db.session_scope_async() as s:
                stmt: Select[Tuple[SessionRow]] = select(SessionRow).where(
                    SessionRow.session_id == session_id)

                result: Result[Tuple[SessionRow]] = await s.execute(stmt)
                session: SessionRow | None = result.scalar_one_or_none()

                if not session:
                    logger.error("Error ")
                    return AResult(
                        code=AResultCode.NOT_FOUND,
                        message="Session not found")

                s.expunge(session)
                return AResult(
                    code=AResultCode.OK,
                    message="Session retrieved successfully.",
                    result=session)

        except Exception as e:
            logger.error(f"Failed to get session: {e}.")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get session.")

    @staticmethod
    async def disable_session_from_session_id_async(session_id: str) -> AResultCode:
        try:
            async with rockit_db.session_scope_async() as s:
                stmt: Update = (
                    update(SessionRow)
                    .where(SessionRow.session_id == session_id)
                    .values(disabled=True)
                )

                result = await s.execute(stmt)

                if result.rowcount == 0:
                    return AResultCode(
                        code=AResultCode.NOT_FOUND,
                        message="Session not found")

                await s.commit()
                return AResultCode(
                    code=AResultCode.OK,
                    message="Session disabled")

        except Exception as e:
            return AResultCode(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to disable session: {e}")
