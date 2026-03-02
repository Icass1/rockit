from typing import List
from logging import Logger
from typing import Tuple

from sqlalchemy import Result, Select, delete
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from backend.core.aResult import AResult, AResultCode
from backend.core.access.db.ormModels.user_liked_media import UserLikedMediaRow
from backend.core.access.db.ormModels.media import CoreMediaRow
from backend.utils.logger import getLogger

logger: Logger = getLogger(__name__)


class UserLikedMediaAccess:
    @staticmethod
    async def add_like(
        session: AsyncSession, user_id: int, media_id: int
    ) -> AResult[UserLikedMediaRow]:
        try:
            user_song = UserLikedMediaRow(user_id=user_id, media_id=media_id)
            session.add(instance=user_song)
            await session.commit()
            await session.refresh(instance=user_song)
            return AResult(code=AResultCode.OK, message="OK", result=user_song)

        except IntegrityError:
            await session.rollback()
            return AResult(code=AResultCode.ALREADY_EXISTS, message="Already liked")
        except Exception as e:
            logger.error(f"Error in add_like: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to add like: {e}",
            )

    @staticmethod
    async def remove_like(
        session: AsyncSession, user_id: int, media_id: int
    ) -> AResult[bool]:
        try:
            stmt = delete(UserLikedMediaRow).where(
                UserLikedMediaRow.user_id == user_id,
                UserLikedMediaRow.media_id == media_id,
            )
            result = await session.execute(stmt)
            await session.commit()

            if result.rowcount == 0:
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message="Like not found",
                )

            return AResult(code=AResultCode.OK, message="OK", result=True)

        except Exception as e:
            logger.error(f"Error in remove_like: {e}")
            await session.rollback()
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to remove like: {e}",
            )

    @staticmethod
    async def get_user_liked_song_public_ids(
        session: AsyncSession, user_id: int
    ) -> AResult[List[str]]:
        try:
            stmt: Select[Tuple[str]] = (
                select(CoreMediaRow.public_id)
                .join(UserLikedMediaRow, UserLikedMediaRow.media_id == CoreMediaRow.id)
                .where(UserLikedMediaRow.user_id == user_id)
                .order_by(UserLikedMediaRow.date_added.desc())
            )
            result: Result[Tuple[str]] = await session.execute(statement=stmt)
            public_ids: List[str] = list(result.scalars().all())

            return AResult(code=AResultCode.OK, message="OK", result=public_ids)

        except Exception as e:
            logger.error(f"Error in get_user_liked_song_public_ids: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get liked songs: {e}",
            )

    @staticmethod
    async def is_song_liked(
        session: AsyncSession, user_id: int, media_id: int
    ) -> AResult[bool]:
        try:
            stmt = select(UserLikedMediaRow).where(
                UserLikedMediaRow.user_id == user_id,
                UserLikedMediaRow.media_id == media_id,
            )
            result = await session.execute(stmt)
            user_song: UserLikedMediaRow | None = result.scalar_one_or_none()

            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=user_song is not None,
            )

        except Exception as e:
            logger.error(f"Error in is_song_liked: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to check like status: {e}",
            )
