from logging import Logger

from sqlalchemy import Result as DBResult
from sqlalchemy import Select, delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from core.access.db.ormModels.media import CoreMediaRow
from core.access.db.ormModels.user_liked_media import UserLikedMediaRow
from logger import getLogger
from result import Result, ResultCode

logger: Logger = getLogger(__name__)


class UserLikedMediaAccess:
    @staticmethod
    async def add_like_async(
        session: AsyncSession, user_id: int, media_id: int
    ) -> Result[UserLikedMediaRow]:
        try:
            user_media = UserLikedMediaRow(user_id=user_id, media_id=media_id)
            session.add(instance=user_media)
            await session.commit()
            await session.refresh(instance=user_media)
            return Result(code=ResultCode.OK, message="OK", result=user_media)

        except IntegrityError:
            await session.rollback()
            return Result(code=ResultCode.ALREADY_EXISTS, message="Already liked")
        except Exception as e:
            logger.error(f"Error in add_like: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to add like: {e}",
            )

    @staticmethod
    async def remove_like_async(session: AsyncSession, user_id: int, media_id: int) -> Result[bool]:
        try:
            stmt = delete(UserLikedMediaRow).where(
                UserLikedMediaRow.user_id == user_id,
                UserLikedMediaRow.media_id == media_id,
            )
            result = await session.execute(stmt)
            await session.commit()

            if result.rowcount == 0:
                return Result(
                    code=ResultCode.NOT_FOUND,
                    message="Like not found",
                )

            return Result(code=ResultCode.OK, message="OK", result=True)

        except Exception as e:
            logger.error(f"Error in remove_like: {e}")
            await session.rollback()
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to remove like: {e}",
            )

    @staticmethod
    async def get_user_liked_media_public_ids_async(
        session: AsyncSession, user_id: int
    ) -> Result[list[str]]:
        try:
            stmt: Select[tuple[str]] = (
                select(CoreMediaRow.public_id)
                .join(UserLikedMediaRow, UserLikedMediaRow.media_id == CoreMediaRow.id)
                .where(UserLikedMediaRow.user_id == user_id)
                .order_by(UserLikedMediaRow.date_added.desc())
            )
            result: DBResult[tuple[str]] = await session.execute(statement=stmt)
            public_ids: list[str] = list(result.scalars().all())

            return Result(code=ResultCode.OK, message="OK", result=public_ids)

        except Exception as e:
            logger.error(f"Error in get_user_liked_media_public_ids: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get liked media: {e}",
            )

    @staticmethod
    async def is_media_liked(session: AsyncSession, user_id: int, media_id: int) -> Result[bool]:
        try:
            stmt = select(UserLikedMediaRow).where(
                UserLikedMediaRow.user_id == user_id,
                UserLikedMediaRow.media_id == media_id,
            )
            result = await session.execute(stmt)
            user_media: UserLikedMediaRow | None = result.scalar_one_or_none()

            return Result(
                code=ResultCode.OK,
                message="OK",
                result=user_media is not None,
            )

        except Exception as e:
            logger.error(f"Error in is_media_liked: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to check like status: {e}",
            )
