from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.access.bookmarkAccess import BookmarkAccess
from backend.core.access.db.ormModels.bookmark import BookmarkRow
from backend.core.enums.bookmarkModeEnum import BookmarkModeEnum

logger = getLogger(__name__)


class Bookmark:
    @staticmethod
    async def get_bookmarks_async(
        session: AsyncSession,
        user_id: int,
        media_public_id: str | None = None,
    ) -> AResult[List[BookmarkRow]]:
        """Get bookmarks for a user, optionally filtered by media."""

        if media_public_id is not None:
            a_result_media = await BookmarkAccess.get_media_by_public_id_async(
                session=session, media_public_id=media_public_id
            )
            if a_result_media.is_not_ok():
                logger.error(
                    f"Media not found {media_public_id}. {a_result_media.info()}"
                )
                return AResult(
                    code=a_result_media.code(), message=a_result_media.message()
                )
            a_result = await BookmarkAccess.get_bookmarks_by_user_and_media_async(
                session=session,
                user_id=user_id,
                media_id=a_result_media.result().id,
            )
        else:
            a_result = await BookmarkAccess.get_bookmarks_by_user_async(
                session=session, user_id=user_id
            )

        if a_result.is_not_ok():
            logger.error(f"Error getting bookmarks. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def create_bookmark_async(
        session: AsyncSession,
        user_id: int,
        media_public_id: str,
        timestamp: float,
        mode: BookmarkModeEnum,
        description: str | None,
    ) -> AResult[BookmarkRow]:
        """Create a bookmark for a media item."""

        a_result_media = await BookmarkAccess.get_media_by_public_id_async(
            session=session, media_public_id=media_public_id
        )
        if a_result_media.is_not_ok():
            logger.error(f"Media not found {media_public_id}. {a_result_media.info()}")
            return AResult(code=a_result_media.code(), message=a_result_media.message())

        a_result = await BookmarkAccess.create_bookmark_async(
            session=session,
            user_id=user_id,
            media_id=a_result_media.result().id,
            timestamp=timestamp,
            mode_key=mode.value,
            description=description,
        )
        if a_result.is_not_ok():
            logger.error(f"Error creating bookmark. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def update_bookmark_async(
        session: AsyncSession,
        user_id: int,
        public_id: str,
        timestamp: float | None,
        mode: BookmarkModeEnum | None,
        description: str | None,
    ) -> AResult[BookmarkRow]:
        """Update an existing bookmark."""

        a_result_bookmark = await BookmarkAccess.get_bookmark_by_public_id_async(
            session=session, public_id=public_id, user_id=user_id
        )
        if a_result_bookmark.is_not_ok():
            logger.error(f"Bookmark not found {public_id}. {a_result_bookmark.info()}")
            return AResult(
                code=a_result_bookmark.code(), message=a_result_bookmark.message()
            )

        a_result = await BookmarkAccess.update_bookmark_async(
            session=session,
            bookmark=a_result_bookmark.result(),
            timestamp=timestamp,
            mode_key=mode.value if mode is not None else None,
            description=description,
        )
        if a_result.is_not_ok():
            logger.error(f"Error updating bookmark {public_id}. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def delete_bookmark_async(
        session: AsyncSession,
        user_id: int,
        public_id: str,
    ) -> AResult[None]:
        """Delete a bookmark."""

        a_result_bookmark = await BookmarkAccess.get_bookmark_by_public_id_async(
            session=session, public_id=public_id, user_id=user_id
        )
        if a_result_bookmark.is_not_ok():
            logger.error(f"Bookmark not found {public_id}. {a_result_bookmark.info()}")
            return AResult(
                code=a_result_bookmark.code(), message=a_result_bookmark.message()
            )

        a_result = await BookmarkAccess.delete_bookmark_async(
            session=session, bookmark=a_result_bookmark.result()
        )
        if a_result.is_not_ok():
            logger.error(f"Error deleting bookmark {public_id}. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK")
