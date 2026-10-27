from collections.abc import Sequence

from sqlalchemy import Result as DBResult
from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.bookmark import BookmarkRow
from core.access.db.ormModels.media import CoreMediaRow
from core.utils.createId import create_id
from core.utils.safeAsyncCall import safe_async
from logger import getLogger
from result import Result, ResultCode

logger = getLogger(__name__)


class BookmarkAccess:
    @staticmethod
    @safe_async
    async def get_bookmarks_by_user_async(
        session: AsyncSession, user_id: int
    ) -> Result[list[BookmarkRow]]:
        """Get all bookmarks for a user."""

        stmt: Select[tuple[BookmarkRow]] = select(BookmarkRow).where(BookmarkRow.user_id == user_id)
        result: DBResult[tuple[BookmarkRow]] = await session.execute(stmt)
        rows: Sequence[BookmarkRow] = result.scalars().all()
        return Result(code=ResultCode.OK, message="OK", result=list(rows))

    @staticmethod
    @safe_async
    async def get_bookmarks_by_user_and_media_async(
        session: AsyncSession, user_id: int, media_id: int
    ) -> Result[list[BookmarkRow]]:
        """Get all bookmarks for a user filtered by media."""

        stmt: Select[tuple[BookmarkRow]] = select(BookmarkRow).where(
            BookmarkRow.user_id == user_id,
            BookmarkRow.media_id == media_id,
        )
        result: DBResult[tuple[BookmarkRow]] = await session.execute(stmt)
        rows: Sequence[BookmarkRow] = result.scalars().all()
        return Result(code=ResultCode.OK, message="OK", result=list(rows))

    @staticmethod
    @safe_async
    async def get_bookmark_by_public_id_async(
        session: AsyncSession, public_id: str, user_id: int
    ) -> Result[BookmarkRow]:
        """Get a single bookmark by its public_id, scoped to a user."""

        stmt: Select[tuple[BookmarkRow]] = select(BookmarkRow).where(
            BookmarkRow.public_id == public_id,
            BookmarkRow.user_id == user_id,
        )
        result: DBResult[tuple[BookmarkRow]] = await session.execute(stmt)
        row: BookmarkRow | None = result.scalars().first()
        if row is None:
            return Result(code=ResultCode.NOT_FOUND, message="Bookmark not found")
        return Result(code=ResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def create_bookmark_async(
        session: AsyncSession,
        user_id: int,
        media_id: int,
        timestamp: float,
        mode_key: int,
        description: str | None,
    ) -> Result[BookmarkRow]:
        """Create a new bookmark."""

        row = BookmarkRow(
            public_id=create_id(32),
            user_id=user_id,
            media_id=media_id,
            timestamp=timestamp,
            mode_key=mode_key,
            description=description,
        )
        session.add(row)
        await session.flush()
        await session.refresh(row)
        return Result(code=ResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def update_bookmark_async(
        session: AsyncSession,
        bookmark: BookmarkRow,
        timestamp: float | None,
        mode_key: int | None,
        description: str | None,
    ) -> Result[BookmarkRow]:
        """Update mutable fields of a bookmark."""

        if timestamp is not None:
            bookmark.timestamp = timestamp
        if mode_key is not None:
            bookmark.mode_key = mode_key
        if description is not None:
            bookmark.description = description
        await session.flush()
        await session.refresh(bookmark)
        return Result(code=ResultCode.OK, message="OK", result=bookmark)

    @staticmethod
    @safe_async
    async def delete_bookmark_async(session: AsyncSession, bookmark: BookmarkRow) -> Result[None]:
        """Delete a bookmark."""

        await session.delete(bookmark)
        await session.flush()
        return Result(code=ResultCode.OK, message="OK")

    @staticmethod
    @safe_async
    async def get_media_by_public_id_async(
        session: AsyncSession, media_public_id: str
    ) -> Result[CoreMediaRow]:
        """Resolve a media public_id to its internal row."""

        stmt: Select[tuple[CoreMediaRow]] = select(CoreMediaRow).where(
            CoreMediaRow.public_id == media_public_id
        )
        result: DBResult[tuple[CoreMediaRow]] = await session.execute(stmt)
        row: CoreMediaRow | None = result.scalars().first()
        if row is None:
            return Result(code=ResultCode.NOT_FOUND, message="Media not found")
        return Result(code=ResultCode.OK, message="OK", result=row)
