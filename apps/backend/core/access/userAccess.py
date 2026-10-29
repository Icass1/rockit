from logging import Logger

from passlib.context import CryptContext
from sqlalchemy import Result as DBResult
from sqlalchemy import Select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from core.access.db.ormModels.image import ImageRow
from core.access.db.ormModels.media import CoreMediaRow
from core.access.db.ormModels.provider import ProviderRow
from core.access.db.ormModels.user import UserRow
from core.access.db.ormModels.user_library_media import UserLibraryMediaRow
from core.access.db.ormModels.user_media_clicked import UserMediaClickedRow
from core.access.db.ormModels.user_media_listen_interval import (
    UserMediaListenIntervalRow,
)
from core.access.db.ormModels.user_media_listened import UserMediaListenedRow
from core.access.db.ormModels.user_seeks import UserSeeksRow
from core.access.db.ormModels.user_skipped_media import UserSkippedMediaRow
from core.framework.media.image import Image
from core.utils.createId import create_id
from core.utils.safeAsyncCall import safe_async
from core.utils.timeIt import time_it
from logger import getLogger
from result import Result, ResultCode

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

logger: Logger = getLogger(__name__)


class UserAccess:
    @staticmethod
    @safe_async
    async def update_user_image_async(
        session: AsyncSession, user_id: int, image_id: int
    ) -> Result[bool]:
        user: UserRow | None = await session.get(UserRow, user_id)
        if user is None:
            return Result(code=ResultCode.NOT_FOUND, message="User not found")
        user.image_id = image_id
        await session.flush()
        return Result(code=ResultCode.OK, message="OK", result=True)

    @staticmethod
    async def get_user_from_id(session: AsyncSession, user_id: int) -> Result[UserRow]:
        try:
            result: UserRow | None = await session.get(entity=UserRow, ident=user_id)

            if not result:
                return Result(code=ResultCode.NOT_FOUND, message="User not found.")

            # Detach from session BEFORE closing session.
            return Result(code=ResultCode.OK, message="OK", result=result)

        except Exception as e:
            logger.error(f"Error in get_user_from_id_async: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get user from id: {e}",
            )

    @staticmethod
    async def get_user_from_username_async(session: AsyncSession, username: str) -> Result[UserRow]:
        try:
            stmt: Select[tuple[UserRow]] = select(UserRow).where(UserRow.username == username)
            result: DBResult[tuple[UserRow]] = await session.execute(statement=stmt)

            user: UserRow | None = result.scalar_one_or_none()

            if not user:
                logger.error("User not found")
                return Result(code=ResultCode.NOT_FOUND, message="User not found")

            # Detach from session BEFORE closing session.
            return Result(code=ResultCode.OK, message="OK", result=user)

        except Exception as e:
            logger.error(f"Error in get_user_from_username_async: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get user from username: {e}",
            )

    @staticmethod
    async def get_user_from_public_id_async(
        session: AsyncSession, public_id: str
    ) -> Result[UserRow]:
        try:
            stmt: Select[tuple[UserRow]] = select(UserRow).where(UserRow.public_id == public_id)
            result: DBResult[tuple[UserRow]] = await session.execute(statement=stmt)

            user: UserRow | None = result.scalar_one_or_none()

            if not user:
                logger.error("User not found")
                return Result(code=ResultCode.NOT_FOUND, message="User not found")

            return Result(code=ResultCode.OK, message="OK", result=user)

        except Exception as e:
            logger.error(f"Error in get_user_from_public_id_async: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get user from public_id: {e}",
            )

    @staticmethod
    async def create_user_async(
        session: AsyncSession, username: str, password: str
    ) -> Result[UserRow]:
        try:
            password_hash: str = pwd.hash(secret=password)

            a_result_image: Result[ImageRow] = await Image.get_image_from_key_async(
                session=session, key="user-placeholder.png"
            )
            if a_result_image.is_not_ok():
                logger.error(f"Error getting placeholder image: {a_result_image.info()}")
                return Result(
                    code=ResultCode.GENERAL_ERROR,
                    message="Failed to get placeholder image",
                )

            user = UserRow(
                public_id=create_id(32),
                username=username,
                image_id=a_result_image.result().id,
                password_hash=password_hash,
            )

            session.add(instance=user)
            await session.commit()
            await session.refresh(instance=user)

            return Result(code=ResultCode.OK, message="OK", result=user)
        except Exception as e:
            logger.error(f"Error in create_user_async: {e}")
            await session.rollback()
            return Result(code=ResultCode.GENERAL_ERROR, message=f"Failed to create user: {e}")

    @staticmethod
    @time_it
    async def get_user_library_medias(
        session: AsyncSession, user_id: int
    ) -> Result[list[tuple[UserLibraryMediaRow, CoreMediaRow, ProviderRow]]]:
        try:
            stmt: Select[tuple[UserLibraryMediaRow]] = (
                select(UserLibraryMediaRow)
                .where(UserLibraryMediaRow.user_id == user_id)
                .order_by(UserLibraryMediaRow.date_added.desc())
                .options(
                    selectinload(UserLibraryMediaRow.media).selectinload(CoreMediaRow.provider)
                )
            )
            result: DBResult[tuple[UserLibraryMediaRow]] = await session.execute(statement=stmt)
            user_library_medias: list[UserLibraryMediaRow] = list(result.scalars().all())

            if not user_library_medias:
                return Result(code=ResultCode.OK, message="OK", result=[])

            medias_with_providers: list[tuple[UserLibraryMediaRow, CoreMediaRow, ProviderRow]] = []
            for um in user_library_medias:
                medias_with_providers.append((um, um.media, um.media.provider))

            return Result(code=ResultCode.OK, message="OK", result=medias_with_providers)

        except Exception as e:
            logger.error(f"Error in get_user_library_medias: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get user media: {e}",
            )

    @staticmethod
    @safe_async
    async def add_user_library_media(
        session: AsyncSession, user_id: int, media_id: int
    ) -> Result[UserLibraryMediaRow]:
        """Idempotently add a library entry without committing the caller's transaction."""
        statement = (
            insert(UserLibraryMediaRow)
            .values(user_id=user_id, media_id=media_id)
            .on_conflict_do_nothing(constraint="uq_user_library_media")
        )
        await session.execute(statement)
        result = await session.execute(
            select(UserLibraryMediaRow).where(
                UserLibraryMediaRow.user_id == user_id,
                UserLibraryMediaRow.media_id == media_id,
            )
        )
        return Result(code=ResultCode.OK, message="OK", result=result.scalar_one())

    @staticmethod
    @safe_async
    async def add_user_library_medias_async(
        session: AsyncSession, user_id: int, media_ids: list[int]
    ) -> Result[bool]:
        """Add a batch to the library in one idempotent database operation."""
        if media_ids:
            statement = (
                insert(UserLibraryMediaRow)
                .values([dict(user_id=user_id, media_id=media_id) for media_id in set(media_ids)])
                .on_conflict_do_nothing(constraint="uq_user_library_media")
            )
            await session.execute(statement)
        return Result(code=ResultCode.OK, message="OK", result=True)

    @staticmethod
    @safe_async
    async def remove_user_library_media(
        session: AsyncSession, user_id: int, media_id: int
    ) -> Result[bool]:
        """Remove an media from user's library."""
        stmt: Select[tuple[UserLibraryMediaRow]] = select(UserLibraryMediaRow).where(
            UserLibraryMediaRow.user_id == user_id,
            UserLibraryMediaRow.media_id == media_id,
        )
        result: DBResult[tuple[UserLibraryMediaRow]] = await session.execute(statement=stmt)
        user_library_media: UserLibraryMediaRow | None = result.scalar_one_or_none()

        if user_library_media is None:
            return Result(
                code=ResultCode.NOT_FOUND,
                message="Media not found in user library",
            )

        await session.delete(instance=user_library_media)
        await session.commit()
        return Result(code=ResultCode.OK, message="OK", result=True)

    @staticmethod
    @safe_async
    async def add_user_current_time_seek_async(
        session: AsyncSession,
        user_id: int,
        media_id: int,
        time_from: float,
        time_to: float,
    ) -> Result[UserSeeksRow]:
        user = UserSeeksRow(
            user_id=user_id, media_id=media_id, time_from=time_from, time_to=time_to
        )

        session.add(instance=user)

        return Result(code=ResultCode.OK, message="OK", result=user)

    @staticmethod
    async def add_user_media_clicked_async(
        session: AsyncSession, user_id: int, media_id: int
    ) -> Result[UserMediaClickedRow]:
        """Record that a user clicked on a media item."""
        try:
            user_media_clicked = UserMediaClickedRow(user_id=user_id, media_id=media_id)
            session.add(instance=user_media_clicked)
            await session.commit()
            await session.refresh(instance=user_media_clicked)
            return Result(code=ResultCode.OK, message="OK", result=user_media_clicked)

        except Exception as e:
            logger.error(f"Error in add_user_media_clicked_async: {e}")
            await session.rollback()
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to add media click: {e}",
            )

    @staticmethod
    async def add_user_skipped_media_async(
        session: AsyncSession, user_id: int, media_id: int, skip_direction_key: int
    ) -> Result[UserSkippedMediaRow]:
        """Record that a user skipped a media item."""
        try:
            user_skipped_media = UserSkippedMediaRow(
                user_id=user_id,
                media_id=media_id,
                skip_direction_key=skip_direction_key,
            )
            session.add(instance=user_skipped_media)
            await session.commit()
            await session.refresh(instance=user_skipped_media)
            return Result(code=ResultCode.OK, message="OK", result=user_skipped_media)

        except Exception as e:
            logger.error(f"Error in add_user_skipped_media_async: {e}")
            await session.rollback()
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to add media skip: {e}",
            )

    @staticmethod
    @safe_async
    async def update_user_current_queue_id_async(
        session: AsyncSession, user_id: int, queue_id: int
    ) -> Result[bool]:
        user: UserRow | None = await session.get(entity=UserRow, ident=user_id)
        if user is None:
            return Result(code=ResultCode.NOT_FOUND, message="User not found")
        if user.current_queue_id != queue_id:
            user.current_time_ms = 0
        user.current_queue_id = queue_id
        await session.commit()
        return Result(code=ResultCode.OK, message="OK", result=True)

    @staticmethod
    @safe_async
    async def update_user_current_time_async(
        session: AsyncSession, user_id: int, current_time_ms: int
    ) -> Result[bool]:
        user: UserRow | None = await session.get(entity=UserRow, ident=user_id)
        if user is None:
            return Result(code=ResultCode.NOT_FOUND, message="User not found")
        user.current_time_ms = current_time_ms
        await session.commit()
        return Result(code=ResultCode.OK, message="OK", result=True)

    @staticmethod
    @safe_async
    async def update_user_lang_async(
        session: AsyncSession, user_id: int, lang_id: int
    ) -> Result[bool]:
        user: UserRow | None = await session.get(entity=UserRow, ident=user_id)
        if user is None:
            return Result(code=ResultCode.NOT_FOUND, message="User not found")
        user.lang_id = lang_id
        await session.commit()
        return Result(code=ResultCode.OK, message="OK", result=True)

    @staticmethod
    @safe_async
    async def update_user_crossfade_async(
        session: AsyncSession, user_id: int, crossfade_ms: int
    ) -> Result[bool]:
        user: UserRow | None = await session.get(entity=UserRow, ident=user_id)
        if user is None:
            return Result(code=ResultCode.NOT_FOUND, message="User not found")
        user.cross_fade_ms = crossfade_ms
        await session.commit()
        return Result(code=ResultCode.OK, message="OK", result=True)

    @staticmethod
    @safe_async
    async def update_user_password_async(
        session: AsyncSession, user_id: int, password_hash: str
    ) -> Result[bool]:
        user: UserRow | None = await session.get(entity=UserRow, ident=user_id)
        if user is None:
            return Result(code=ResultCode.NOT_FOUND, message="User not found")
        user.password_hash = password_hash
        await session.commit()
        return Result(code=ResultCode.OK, message="OK", result=True)

    @staticmethod
    @safe_async
    async def update_user_queue_type_async(
        session: AsyncSession, user_id: int, queue_type_key: int
    ) -> Result[bool]:
        user: UserRow | None = await session.get(entity=UserRow, ident=user_id)
        if user is None:
            return Result(code=ResultCode.NOT_FOUND, message="User not found")
        user.queue_type_key = queue_type_key
        await session.commit()
        return Result(code=ResultCode.OK, message="OK", result=True)

    @staticmethod
    @safe_async
    async def update_user_repeat_mode_async(
        session: AsyncSession, user_id: int, repeat_mode_key: int
    ) -> Result[bool]:
        user: UserRow | None = await session.get(entity=UserRow, ident=user_id)
        if user is None:
            return Result(code=ResultCode.NOT_FOUND, message="User not found")
        user.repeat_mode_key = repeat_mode_key
        await session.commit()
        return Result(code=ResultCode.OK, message="OK", result=True)

    @staticmethod
    @safe_async
    async def add_user_media_listened_async(
        session: AsyncSession, user_id: int, media_id: int
    ) -> Result[UserMediaListenedRow]:
        """Record that a user has listened to a media item (>=90% of song)."""

        user_media_listened = UserMediaListenedRow(
            user_id=user_id,
            media_id=media_id,
        )
        session.add(instance=user_media_listened)
        await session.commit()
        await session.refresh(instance=user_media_listened)
        return Result(code=ResultCode.OK, message="OK", result=user_media_listened)

    @staticmethod
    @safe_async
    async def add_user_media_listen_interval_async(
        session: AsyncSession,
        user_id: int,
        media_id: int,
        time_ms_start: int,
        time_ms_end: int,
    ) -> Result[UserMediaListenIntervalRow]:
        """Record a listen interval with start and end times."""

        interval = UserMediaListenIntervalRow(
            user_id=user_id,
            media_id=media_id,
            time_ms_start=time_ms_start,
            time_ms_end=time_ms_end,
        )
        session.add(instance=interval)
        await session.commit()
        await session.refresh(instance=interval)
        return Result(code=ResultCode.OK, message="OK", result=interval)

    @staticmethod
    @safe_async
    async def update_user_media_listen_interval_end_async(
        session: AsyncSession,
        interval_id: int,
        time_ms_end: int,
    ) -> ResultCode:
        """Update the end time of an existing open listen interval."""

        interval: UserMediaListenIntervalRow | None = await session.get(
            entity=UserMediaListenIntervalRow, ident=interval_id
        )
        if interval is None:
            return ResultCode(code=ResultCode.NOT_FOUND, message="Listen interval not found")

        interval.time_ms_end = max(interval.time_ms_end, time_ms_end)
        await session.commit()
        return ResultCode(code=ResultCode.OK, message="OK")

    @staticmethod
    @safe_async
    async def update_download_settings_async(
        session: AsyncSession, user: UserRow, auto_add: bool
    ) -> Result[bool]:
        """Persist the user's automatic library preference."""
        user.auto_add_downloads_to_library = auto_add
        await session.flush()
        return Result(code=ResultCode.OK, message="OK", result=True)
