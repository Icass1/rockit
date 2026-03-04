from typing import List, Tuple
from logging import Logger
from sqlalchemy.future import select
from sqlalchemy import Result, Select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from passlib.context import CryptContext

from backend.core.aResult import AResult, AResultCode
from backend.core.access.db.ormModels.user import UserRow
from backend.core.access.db.ormModels.media import CoreMediaRow
from backend.core.access.db.ormModels.provider import ProviderRow
from backend.core.access.db.ormModels.user_library_media import UserLibraryMediaRow
from backend.core.access.db.ormModels.user_seeks import UserSeeksRow
from backend.core.utils.safeAsyncCall import safe_async
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
            return AResult(code=AResultCode.OK, message="OK", result=result)

        except Exception as e:
            logger.error(f"Error in get_user_from_id_async: {e}")
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
            return AResult(code=AResultCode.OK, message="OK", result=user)

        except Exception as e:
            logger.error(f"Error in get_user_from_username_async: {e}")
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
                public_id=create_id(32),
                username=username,
                password_hash=password_hash,
            )

            session.add(instance=user)
            await session.commit()
            await session.refresh(instance=user)

            return AResult(code=AResultCode.OK, message="OK", result=user)
        except Exception as e:
            logger.error(f"Error in create_user_async: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR, message=f"Failed to create user: {e}"
            )

    @staticmethod
    async def get_user_library_medias(
        session: AsyncSession, user_id: int
    ) -> AResult[List[Tuple[UserLibraryMediaRow, CoreMediaRow, ProviderRow]]]:
        try:
            stmt: Select[Tuple[UserLibraryMediaRow]] = (
                select(UserLibraryMediaRow)
                .where(UserLibraryMediaRow.user_id == user_id)
                .options(
                    selectinload(UserLibraryMediaRow.media).selectinload(
                        CoreMediaRow.provider
                    )
                )
            )
            result: Result[Tuple[UserLibraryMediaRow]] = await session.execute(
                statement=stmt
            )
            user_library_medias: List[UserLibraryMediaRow] = list(
                result.scalars().all()
            )

            if not user_library_medias:
                return AResult(code=AResultCode.OK, message="OK", result=[])

            medias_with_providers: List[
                Tuple[UserLibraryMediaRow, CoreMediaRow, ProviderRow]
            ] = []
            for um in user_library_medias:
                medias_with_providers.append((um, um.media, um.media.provider))

            return AResult(
                code=AResultCode.OK, message="OK", result=medias_with_providers
            )

        except Exception as e:
            logger.error(f"Error in get_user_library_medias: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get user media: {e}",
            )

    @staticmethod
    async def add_user_library_media(
        session: AsyncSession, user_id: int, media_id: int
    ) -> AResult[UserLibraryMediaRow]:
        """Add an media to user's library."""
        try:
            user_library_media = UserLibraryMediaRow(user_id=user_id, media_id=media_id)
            session.add(instance=user_library_media)
            await session.commit()
            await session.refresh(instance=user_library_media)
            return AResult(code=AResultCode.OK, message="OK", result=user_library_media)

        except Exception as e:
            logger.error(f"Error in add_user_library_media: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to add media to user library: {e}",
            )

    @staticmethod
    @safe_async
    async def remove_user_library_media(
        session: AsyncSession, user_id: int, media_id: int
    ) -> AResult[bool]:
        """Remove an media from user's library."""
        stmt: Select[Tuple[UserLibraryMediaRow]] = select(UserLibraryMediaRow).where(
            UserLibraryMediaRow.user_id == user_id,
            UserLibraryMediaRow.media_id == media_id,
        )
        result: Result[Tuple[UserLibraryMediaRow]] = await session.execute(
            statement=stmt
        )
        user_library_media: UserLibraryMediaRow | None = result.scalar_one_or_none()

        if user_library_media is None:
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="Media not found in user library",
            )

        await session.delete(instance=user_library_media)
        await session.commit()
        return AResult(code=AResultCode.OK, message="OK", result=True)

    @staticmethod
    @safe_async
    async def add_user_current_time_seek_async(
        session: AsyncSession,
        user_id: int,
        media_id: int,
        time_from: float,
        time_to: float,
    ) -> AResult[UserSeeksRow]:
        user = UserSeeksRow(
            user_id=user_id, media_id=media_id, time_from=time_from, time_to=time_to
        )

        session.add(instance=user)

        return AResult(code=AResultCode.OK, message="OK", result=user)
