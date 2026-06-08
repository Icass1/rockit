import uuid
from typing import List, Sequence, Tuple

from sqlalchemy import Result, Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.utils.safeAsyncCall import safe_async
from backend.core.access.db.ormModels.bookmark import BookmarkRow
from backend.core.access.db.ormModels.media import CoreMediaRow

logger = getLogger(__name__)


class BookmarkAccess:
    @staticmethod
    @safe_async
    async def get_bookmarks_by_user_async(
        session: AsyncSession, user_id: int
    ) -> AResult[List[BookmarkRow]]:
        """Get all bookmarks for a user."""

        stmt: Select[Tuple[BookmarkRow]] = select(BookmarkRow).where(
            BookmarkRow.user_id == user_id
        )
        result: Result[Tuple[BookmarkRow]] = await session.execute(stmt)
        rows: Sequence[BookmarkRow] = result.scalars().all()
        return AResult(code=AResultCode.OK, message="OK", result=list(rows))

    @staticmethod
    @safe_async
    async def get_bookmarks_by_user_and_media_async(
        session: AsyncSession, user_id: int, media_id: int
    ) -> AResult[List[BookmarkRow]]:
        """Get all bookmarks for a user filtered by media."""

        stmt: Select[Tuple[BookmarkRow]] = select(BookmarkRow).where(
            BookmarkRow.user_id == user_id,
            BookmarkRow.media_id == media_id,
        )
        result: Result[Tuple[BookmarkRow]] = await session.execute(stmt)
        rows: Sequence[BookmarkRow] = result.scalars().all()
        return AResult(code=AResultCode.OK, message="OK", result=list(rows))

    @staticmethod
    @safe_async
    async def get_bookmark_by_public_id_async(
        session: AsyncSession, public_id: str, user_id: int
    ) -> AResult[BookmarkRow]:
        """Get a single bookmark by its public_id, scoped to a user."""

        stmt: Select[Tuple[BookmarkRow]] = select(BookmarkRow).where(
            BookmarkRow.public_id == public_id,
            BookmarkRow.user_id == user_id,
        )
        result: Result[Tuple[BookmarkRow]] = await session.execute(stmt)
        row: BookmarkRow | None = result.scalars().first()
        if row is None:
            return AResult(code=AResultCode.NOT_FOUND, message="Bookmark not found")
        return AResult(code=AResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def create_bookmark_async(
        session: AsyncSession,
        user_id: int,
        media_id: int,
        timestamp: float,
        mode_key: int,
        description: str | None,
    ) -> AResult[BookmarkRow]:
        """Create a new bookmark."""

        row = BookmarkRow(
            public_id=str(uuid.uuid4()),
            user_id=user_id,
            media_id=media_id,
            timestamp=timestamp,
            mode_key=mode_key,
            description=description,
        )
        session.add(row)
        await session.flush()
        await session.refresh(row)
        return AResult(code=AResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def update_bookmark_async(
        session: AsyncSession,
        bookmark: BookmarkRow,
        timestamp: float | None,
        mode_key: int | None,
        description: str | None,
    ) -> AResult[BookmarkRow]:
        """Update mutable fields of a bookmark."""

        if timestamp is not None:
            bookmark.timestamp = timestamp
        if mode_key is not None:
            bookmark.mode_key = mode_key
        if description is not None:
            bookmark.description = description
        await session.flush()
        await session.refresh(bookmark)
        return AResult(code=AResultCode.OK, message="OK", result=bookmark)

    @staticmethod
    @safe_async
    async def delete_bookmark_async(
        session: AsyncSession, bookmark: BookmarkRow
    ) -> AResult[None]:
        """Delete a bookmark."""

        await session.delete(bookmark)
        await session.flush()
        return AResult(code=AResultCode.OK, message="OK")

    @staticmethod
    @safe_async
    async def get_media_by_public_id_async(
        session: AsyncSession, media_public_id: str
    ) -> AResult[CoreMediaRow]:
        """Resolve a media public_id to its internal row."""

        stmt: Select[Tuple[CoreMediaRow]] = select(CoreMediaRow).where(
            CoreMediaRow.public_id == media_public_id
        )
        result: Result[Tuple[CoreMediaRow]] = await session.execute(stmt)
        row: CoreMediaRow | None = result.scalars().first()
        if row is None:
            return AResult(code=AResultCode.NOT_FOUND, message="Media not found")
        return AResult(code=AResultCode.OK, message="OK", result=row)
