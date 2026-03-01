from typing import List, Tuple
from logging import Logger
from sqlalchemy.future import select
from sqlalchemy import Result, Select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from passlib.context import CryptContext

from backend.core.aResult import AResult, AResultCode
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
    async def get_user_from_id(session: AsyncSession, user_id: int) -> AResult[UserRow]:
        try:
            result: UserRow | None = await session.get(entity=UserRow, ident=user_id)

            if not result:
                return AResult(code=AResultCode.NOT_FOUND, message="User not found.")

            # Detach from session BEFORE closing session.
            session.expunge(instance=result)
            return AResult(code=AResultCode.OK, message="OK", result=result)

        except Exception as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get user from id: {e}",
            )

    @staticmethod
    async def get_user_from_username_async(
        session: AsyncSession, username: str
    ) -> AResult[UserRow]:
        try:
            stmt: Select[Tuple[UserRow]] = select(UserRow).where(
                UserRow.username == username
            )
            result: Result[Tuple[UserRow]] = await session.execute(statement=stmt)

            user: UserRow | None = result.scalar_one_or_none()

            if not user:
                logger.error("User not found")
                return AResult(code=AResultCode.NOT_FOUND, message="User not found")

            # Detach from session BEFORE closing session.
            session.expunge(instance=user)
            return AResult(code=AResultCode.OK, message="OK", result=user)

        except Exception as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get user from username: {e}",
            )

    @staticmethod
    async def create_user_async(
        session: AsyncSession, username: str, password: str
    ) -> AResult[UserRow]:
        try:
            password_hash: str = pwd.hash(secret=password)

            user = UserRow(
                public_id=create_id(),
                username=username,
                password_hash=password_hash,
            )

            session.add(instance=user)
            await session.commit()
            await session.refresh(instance=user)
            session.expunge(instance=user)

            return AResult(code=AResultCode.OK, message="OK", result=user)
        except Exception as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR, message=f"Failed to create user: {e}"
            )

    @staticmethod
    async def get_user_albums(
        session: AsyncSession, user_id: int
    ) -> AResult[List[Tuple[UserAlbumRow, CoreAlbumRow, ProviderRow]]]:
        try:
            stmt: Select[Tuple[UserAlbumRow]] = (
                select(UserAlbumRow)
                .where(UserAlbumRow.user_id == user_id)
                .options(
                    selectinload(UserAlbumRow.album).selectinload(CoreAlbumRow.provider)
                )
            )
            result: Result[Tuple[UserAlbumRow]] = await session.execute(statement=stmt)
            user_albums: List[UserAlbumRow] = list(result.scalars().all())

            if not user_albums:
                return AResult(
                    code=AResultCode.NOT_FOUND, message="No albums found for user."
                )

            albums_with_providers: List[
                Tuple[UserAlbumRow, CoreAlbumRow, ProviderRow]
            ] = []
            for ua in user_albums:
                session.expunge(instance=ua)
                session.expunge(instance=ua.album)
                session.expunge(instance=ua.album.provider)
                albums_with_providers.append((ua, ua.album, ua.album.provider))

            return AResult(
                code=AResultCode.OK, message="OK", result=albums_with_providers
            )

        except Exception as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get user albums: {e}",
            )

    @staticmethod
    async def add_user_album(
        session: AsyncSession, user_id: int, album_id: int
    ) -> AResult[UserAlbumRow]:
        """Add an album to user's library."""
        try:
            user_album = UserAlbumRow(user_id=user_id, album_id=album_id)
            session.add(instance=user_album)
            await session.commit()
            await session.refresh(instance=user_album)
            session.expunge(instance=user_album)
            return AResult(code=AResultCode.OK, message="OK", result=user_album)

        except Exception as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to add album to user library: {e}",
            )

    @staticmethod
    async def remove_user_album(
        session: AsyncSession, user_id: int, album_id: int
    ) -> AResult[bool]:
        """Remove an album from user's library."""
        try:
            stmt: Select[Tuple[UserAlbumRow]] = select(UserAlbumRow).where(
                UserAlbumRow.user_id == user_id,
                UserAlbumRow.album_id == album_id,
            )
            result: Result[Tuple[UserAlbumRow]] = await session.execute(statement=stmt)
            user_album: UserAlbumRow | None = result.scalar_one_or_none()

            if user_album is None:
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message="Album not found in user library",
                )

            await session.delete(instance=user_album)
            await session.commit()
            return AResult(code=AResultCode.OK, message="OK", result=True)

        except Exception as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to remove album from user library: {e}",
            )
