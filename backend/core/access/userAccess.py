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
from backend.core.access.db.ormModels.user_media import UserMediaRow
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
                public_id=create_id(),
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
    async def get_user_medias(
        session: AsyncSession, user_id: int
    ) -> AResult[List[Tuple[UserMediaRow, CoreMediaRow, ProviderRow]]]:
        try:
            stmt: Select[Tuple[UserMediaRow]] = (
                select(UserMediaRow)
                .where(UserMediaRow.user_id == user_id)
                .options(
                    selectinload(UserMediaRow.media).selectinload(CoreMediaRow.provider)
                )
            )
            result: Result[Tuple[UserMediaRow]] = await session.execute(statement=stmt)
            user_medias: List[UserMediaRow] = list(result.scalars().all())

            if not user_medias:
                return AResult(
                    code=AResultCode.NOT_FOUND, message="No media found for user."
                )

            medias_with_providers: List[
                Tuple[UserMediaRow, CoreMediaRow, ProviderRow]
            ] = []
            for um in user_medias:
                medias_with_providers.append((um, um.media, um.media.provider))

            return AResult(
                code=AResultCode.OK, message="OK", result=medias_with_providers
            )

        except Exception as e:
            logger.error(f"Error in get_user_medias: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get user media: {e}",
            )

    @staticmethod
    async def add_user_media(
        session: AsyncSession, user_id: int, media_id: int
    ) -> AResult[UserMediaRow]:
        """Add an media to user's library."""
        try:
            user_media = UserMediaRow(user_id=user_id, media_id=media_id)
            session.add(instance=user_media)
            await session.commit()
            await session.refresh(instance=user_media)
            return AResult(code=AResultCode.OK, message="OK", result=user_media)

        except Exception as e:
            logger.error(f"Error in add_user_media: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to add media to user library: {e}",
            )

    @staticmethod
    async def remove_user_media(
        session: AsyncSession, user_id: int, media_id: int
    ) -> AResult[bool]:
        """Remove an media from user's library."""
        try:
            stmt: Select[Tuple[UserMediaRow]] = select(UserMediaRow).where(
                UserMediaRow.user_id == user_id,
                UserMediaRow.media_id == media_id,
            )
            result: Result[Tuple[UserMediaRow]] = await session.execute(statement=stmt)
            user_media: UserMediaRow | None = result.scalar_one_or_none()

            if user_media is None:
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message="Media not found in user library",
                )

            await session.delete(instance=user_media)
            await session.commit()
            return AResult(code=AResultCode.OK, message="OK", result=True)

        except Exception as e:
            logger.error(f"Error in remove_user_media: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to remove media from user library: {e}",
            )
