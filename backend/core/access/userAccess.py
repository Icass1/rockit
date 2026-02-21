

from logging import Logger
from typing import Tuple
from sqlalchemy import Result, Select
from sqlalchemy.future import select
from passlib.context import CryptContext

from backend.core.aResult import AResult, AResultCode
from backend.core.access.db import rockit_db
from backend.core.access.db.ormModels.user import UserRow
from backend.utils.backendUtils import create_id
from backend.utils.logger import getLogger

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

logger: Logger = getLogger(__name__)


class UserAccess:
    @staticmethod
    async def get_user_from_id(user_id: int) -> AResult[UserRow]:
        try:
            async with rockit_db.session_scope() as s:
                result: UserRow | None = await s.get(entity=UserRow, ident=user_id)

                if not result:
                    return AResult(code=AResultCode.NOT_FOUND, message="User not found.")

                # Detach from session BEFORE closing session.
                s.expunge(instance=result)
                return AResult(code=AResultCode.OK, message="OK", result=result)

        except Exception as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get user from id: {e}")

    @staticmethod
    async def get_user_from_username_async(username: str) -> AResult[UserRow]:
        try:
            async with rockit_db.session_scope() as s:
                stmt: Select[Tuple[UserRow]] = select(
                    UserRow).where(UserRow.username == username)
                result: Result[Tuple[UserRow]] = await s.execute(statement=stmt)

                user: UserRow | None = result.scalar_one_or_none()

                if not user:
                    logger.error("User not found")
                    return AResult(code=AResultCode.NOT_FOUND, message="User not found")

                # Detach from session BEFORE closing session.
                s.expunge(instance=user)
                return AResult(code=AResultCode.OK, message="OK", result=user)

        except Exception as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get user from username: {e}")

    @staticmethod
    async def create_user_async(username: str, password: str) -> AResult[UserRow]:
        try:
            password_hash: str = pwd.hash(secret=password)

            async with rockit_db.session_scope() as s:
                user = UserRow(
                    public_id=create_id(),
                    username=username,
                    password_hash=password_hash
                )

                s.add(instance=user)
                await s.commit()
                await s.refresh(instance=user)
                s.expunge(instance=user)

                return AResult(code=AResultCode.OK, message="OK", result=user)
        except Exception as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to create user: {e}")
