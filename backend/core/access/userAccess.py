

from typing import List, Tuple
from logging import Logger
from sqlalchemy.future import select
from sqlalchemy import Result, Select
from sqlalchemy.orm import selectinload
from passlib.context import CryptContext

from backend.core.aResult import AResult, AResultCode
from backend.core.access.db import rockit_db
from backend.core.access.db.ormModels.user import UserRow
from backend.core.access.db.ormModels.user_album import UserAlbumRow
from backend.core.access.db.ormModels.album import CoreAlbumRow
from backend.core.access.db.ormModels.provider import ProviderRow
from backend.utils.backendUtils import create_id
from backend.utils.logger import getLogger

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

logger: Logger = getLogger(__name__)


class UserAccess:
    @staticmethod
    async def get_user_from_id(user_id: int) -> AResult[UserRow]:
        try:
            async with rockit_db.session_scope_async() as s:
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
            async with rockit_db.session_scope_async() as s:
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

            async with rockit_db.session_scope_async() as s:
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

    @staticmethod
    async def get_user_albums(user_id: int) -> AResult[List[Tuple[UserAlbumRow, CoreAlbumRow, ProviderRow]]]:
        try:
            async with rockit_db.session_scope_async() as s:
                stmt: Select[Tuple[UserAlbumRow]] = (
                    select(UserAlbumRow)
                    .where(UserAlbumRow.user_id == user_id)
                    .options(
                        selectinload(UserAlbumRow.album)
                        .selectinload(CoreAlbumRow.provider)
                    )
                )
                result: Result[Tuple[UserAlbumRow]] = await s.execute(statement=stmt)
                user_albums: List[UserAlbumRow] = list(result.scalars().all())

                if not user_albums:
                    return AResult(code=AResultCode.NOT_FOUND, message="No albums found for user.")

                albums_with_providers: List[Tuple[UserAlbumRow, CoreAlbumRow, ProviderRow]] = []
                for ua in user_albums:
                    s.expunge(instance=ua)
                    s.expunge(instance=ua.album)
                    s.expunge(instance=ua.album.provider)
                    albums_with_providers.append((ua, ua.album, ua.album.provider))

                return AResult(code=AResultCode.OK, message="OK", result=albums_with_providers)

        except Exception as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get user albums: {e}")
