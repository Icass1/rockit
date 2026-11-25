from datetime import UTC, datetime
from logging import Logger

from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.access.db.ormModels.download import DownloadRow
from core.access.db.ormModels.downloadGroup import DownloadGroupRow
from core.access.db.ormModels.downloadStatus import DownloadStatusRow
from core.access.db.ormModels.media import CoreMediaRow
from core.enums.downloadStatusEnum import TERMINAL_DOWNLOAD_STATUS_KEYS, DownloadStatusEnum
from core.enums.mediaTypeEnum import MediaTypeEnum
from core.utils.createId import create_id
from core.utils.safeAsyncCall import safe_async
from logger import getLogger
from result import Result, ResultCode

logger: Logger = getLogger(__name__)


class DownloadAccess:
    @staticmethod
    @safe_async
    async def get_latest_downloaded_media_public_ids_async(
        session: AsyncSession, user_id: int, limit: int = 50
    ) -> Result[list[str]]:
        """Get distinct playable media from this user's completed download history."""
        statement = (
            select(CoreMediaRow.public_id)
            .join(DownloadRow, DownloadRow.media_id == CoreMediaRow.id)
            .join(DownloadGroupRow, DownloadGroupRow.id == DownloadRow.download_group_id)
            .where(
                DownloadGroupRow.user_id == user_id,
                DownloadRow.status_key == DownloadStatusEnum.COMPLETED.value,
                DownloadRow.date_ended.is_not(None),
                CoreMediaRow.media_type_key.in_(
                    [MediaTypeEnum.SONG.value, MediaTypeEnum.VIDEO.value]
                ),
            )
            .group_by(CoreMediaRow.id, CoreMediaRow.public_id)
            .order_by(func.max(DownloadRow.date_ended).desc(), func.max(DownloadRow.id).desc())
            .limit(limit)
        )
        rows = await session.execute(statement=statement)
        return Result(code=ResultCode.OK, message="OK", result=list(rows.scalars().all()))

    @staticmethod
    @safe_async
    async def create_download_group(
        session: AsyncSession,
        user_id: int,
        title: str,
        source_public_id: str | None = None,
    ) -> Result[DownloadGroupRow]:
        """Create a new download group row and flush so its id is available."""

        row: DownloadGroupRow = DownloadGroupRow(
            public_id=create_id(32),
            user_id=user_id,
            title=title,
            date_started=datetime.now(UTC),
        )
        row.source_public_id = source_public_id
        session.add(row)
        await session.flush()
        return Result(code=ResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def create_download(
        session: AsyncSession,
        download_group_id: int,
        media_id: int,
    ) -> Result[DownloadRow]:
        """Create a new download row for a single song and flush so its id is available."""

        result = await session.execute(
            select(DownloadRow)
            .where(DownloadRow.media_id == media_id)
            .where(DownloadRow.download_group_id == download_group_id)
        )
        existing = result.scalar_one_or_none()
        if existing:
            return Result(code=ResultCode.OK, message="OK", result=existing)

        # result_any = await session.execute(
        #     select(DownloadRow)
        #     .where(DownloadRow.media_id == media_id)
        #     .where(DownloadRow.status_key == 3)
        # )
        # existing_completed = result_any.scalar_one_or_none()
        # if existing_completed:
        #     return Result(
        #         code=ResultCode.ALREADY_EXISTS,
        #         message="Download already exists for this media",
        #         result=existing_completed,
        #     )

        row: DownloadRow = DownloadRow(
            public_id=create_id(32),
            download_group_id=download_group_id,
            media_id=media_id,
            date_started=datetime.now(UTC),
        )
        session.add(row)
        await session.flush()
        return Result(code=ResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def create_download_status(
        session: AsyncSession,
        download_id: int,
        completed: float,
        message: str,
    ) -> Result[DownloadStatusRow]:
        """Insert a new row in DownloadStatusRow and flush so its id is available."""

        row: DownloadStatusRow = DownloadStatusRow(
            download_id=download_id,
            completed=round(float(completed), 2),
            message=message,
        )
        session.add(row)
        await session.flush()

        return Result(code=ResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def update_download_group_completion(
        session: AsyncSession,
        download_group_id: int,
    ) -> Result[DownloadGroupRow]:
        """Update download group with success/fail counts and date_ended."""

        group = await session.scalar(
            select(DownloadGroupRow)
            .where(DownloadGroupRow.id == download_group_id)
            .with_for_update()
        )
        if group is None:
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Download group {download_group_id} not found",
            )
        result = await session.execute(
            select(DownloadRow).where(DownloadRow.download_group_id == download_group_id)
        )
        downloads: list[DownloadRow] = list(result.scalars().all())

        success_count: int = 0
        fail_count: int = 0
        for download in downloads:
            if download.status_key == DownloadStatusEnum.COMPLETED.value:
                success_count += 1
            elif download.status_key == DownloadStatusEnum.FAILED.value:
                fail_count += 1

        group.success = success_count
        group.fail = fail_count
        if any(download.status_key not in TERMINAL_DOWNLOAD_STATUS_KEYS for download in downloads):
            return Result(code=ResultCode.OK, message="OK", result=group)

        group.date_ended = group.date_ended or datetime.now(UTC)
        if fail_count > 0:
            group.status_key = DownloadStatusEnum.FAILED.value
        elif success_count < len(downloads):
            group.status_key = DownloadStatusEnum.CANCELLED.value
        else:
            group.status_key = DownloadStatusEnum.COMPLETED.value

        return Result(code=ResultCode.OK, message="OK", result=group)

    @staticmethod
    @safe_async
    async def finalize_download_async(
        session: AsyncSession,
        download_id: int,
        status_key: int,
    ) -> Result[DownloadRow]:
        """Set status_key and date_ended on a download, then commit."""

        result = await session.execute(
            select(DownloadRow)
            .where(DownloadRow.id == download_id)
            .options(selectinload(DownloadRow.download_status_list))
        )
        download: DownloadRow | None = result.scalar_one_or_none()
        if download is None:
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Download {download_id} not found",
            )

        download.status_key = status_key
        download.date_ended = datetime.now(UTC)
        await session.commit()
        return Result(code=ResultCode.OK, message="OK", result=download)

    @staticmethod
    @safe_async
    async def update_download_status(
        session: AsyncSession,
        download_id: int,
        status_key: int,
    ) -> Result[DownloadRow]:
        """Update the status_key of a download row."""

        result = await session.execute(select(DownloadRow).where(DownloadRow.id == download_id))
        download: DownloadRow | None = result.scalar_one_or_none()
        if download is None:
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Download {download_id} not found",
            )

        download.status_key = status_key
        return Result(code=ResultCode.OK, message="OK", result=download)

    @staticmethod
    @safe_async
    async def get_download_groups_by_user_id(
        session: AsyncSession,
        user_id: int,
    ) -> Result[list[DownloadGroupRow]]:
        """Get all download groups for a user, ordered by most recent first."""

        result = await session.execute(
            select(DownloadGroupRow)
            .where(DownloadGroupRow.user_id == user_id, DownloadGroupRow.seen.is_(False))
            .order_by(DownloadGroupRow.date_started.desc())
        )
        groups: list[DownloadGroupRow] = list(result.scalars().all())
        return Result(code=ResultCode.OK, message="OK", result=groups)

    @staticmethod
    @safe_async
    async def mark_download_group_seen(
        session: AsyncSession,
        group: DownloadGroupRow,
    ) -> Result[bool]:
        """Mark a download group as seen."""

        await session.execute(
            update(DownloadGroupRow).where(DownloadGroupRow.id == group.id).values(seen=True)
        )
        return Result(code=ResultCode.OK, message="OK", result=True)

    @staticmethod
    @safe_async
    async def get_downloads_by_group_id(
        session: AsyncSession,
        download_group_id: int,
    ) -> Result[list[DownloadRow]]:
        """Get all download rows for a download group."""

        result = await session.execute(
            select(DownloadRow).where(DownloadRow.download_group_id == download_group_id)
        )
        downloads: list[DownloadRow] = list(result.scalars().all())
        return Result(code=ResultCode.OK, message="OK", result=downloads)

    @staticmethod
    @safe_async
    async def get_downloads_by_group_ids(
        session: AsyncSession,
        download_group_ids: list[int],
    ) -> Result[list[DownloadRow]]:
        """Get all download rows for multiple download groups in a single query.

        Uses selectinload to eager load the download status list and avoids the
        N+1 pattern of querying each group separately.
        """

        result = await session.execute(
            select(DownloadRow)
            .options(selectinload(DownloadRow.download_status_list))
            .where(
                DownloadRow.download_group_id.in_(download_group_ids),
                DownloadRow.seen.is_(False),
            )
        )
        downloads: list[DownloadRow] = list(result.scalars().all())
        return Result(code=ResultCode.OK, message="OK", result=downloads)

    @staticmethod
    @safe_async
    async def get_download_group_by_public_id(
        session: AsyncSession,
        public_id: str,
        user_id: int,
        lock: bool = False,
    ) -> Result[DownloadGroupRow]:
        """Get a download group by public_id, scoped to a user."""

        stmt = select(DownloadGroupRow).where(
            DownloadGroupRow.public_id == public_id, DownloadGroupRow.user_id == user_id
        )
        if lock:
            stmt = stmt.with_for_update()
        result = await session.execute(stmt)
        group: DownloadGroupRow | None = result.scalar_one_or_none()
        if group is None:
            return Result(
                code=ResultCode.NOT_FOUND,
                message="Download group not found",
            )
        return Result(code=ResultCode.OK, message="OK", result=group)

    @staticmethod
    @safe_async
    async def delete_download_group_with_downloads(
        session: AsyncSession,
        group: DownloadGroupRow,
    ) -> Result[bool]:
        """Delete a download group and all its child downloads."""

        result = await session.execute(
            select(DownloadRow).where(DownloadRow.download_group_id == group.id)
        )
        downloads: list[DownloadRow] = list(result.scalars().all())
        for download in downloads:
            await session.delete(download)

        await session.delete(group)
        return Result(code=ResultCode.OK, message="OK", result=True)

    @staticmethod
    @safe_async
    async def get_download_by_id(
        session: AsyncSession,
        download_id: int,
    ) -> Result[DownloadRow]:
        """Get a download row by its id."""

        result = await session.execute(
            select(DownloadRow)
            .options(selectinload(DownloadRow.download_status_list))
            .where(DownloadRow.id == download_id)
        )
        download: DownloadRow | None = result.scalar_one_or_none()
        if download is None:
            return Result(
                code=ResultCode.NOT_FOUND,
                message=f"Download {download_id} not found",
            )
        return Result(code=ResultCode.OK, message="OK", result=download)

    @staticmethod
    @safe_async
    async def increment_retry_count(
        session: AsyncSession,
        download_id: int,
    ) -> Result[int]:
        """Increment the retry_count for a download and return the new count."""

        result = await session.execute(select(DownloadRow).where(DownloadRow.id == download_id))
        download: DownloadRow | None = result.scalar_one_or_none()
        if download is None:
            return Result(
                code=ResultCode.NOT_FOUND,
                message=f"Download {download_id} not found",
            )

        download.retry_count += 1
        await session.flush()
        return Result(code=ResultCode.OK, message="OK", result=download.retry_count)

    @staticmethod
    @safe_async
    async def reset_download_for_retry(
        session: AsyncSession,
        download_id: int,
    ) -> Result[DownloadRow]:
        """Reset a download row to PENDING status with retry_count=0."""

        result = await session.execute(select(DownloadRow).where(DownloadRow.id == download_id))
        download: DownloadRow | None = result.scalar_one_or_none()
        if download is None:
            return Result(
                code=ResultCode.NOT_FOUND,
                message=f"Download {download_id} not found",
            )

        download.status_key = DownloadStatusEnum.PENDING.value
        download.retry_count = 0
        download.date_ended = None
        return Result(code=ResultCode.OK, message="OK", result=download)

    @staticmethod
    @safe_async
    async def get_download_by_media_public_id(
        session: AsyncSession,
        media_public_id: str,
        user_id: int,
        lock: bool = False,
        visible_only: bool = False,
    ) -> Result[DownloadRow]:
        """Get the latest download row for a given media public_id and user."""

        stmt = (
            select(DownloadRow)
            .join(DownloadGroupRow, DownloadRow.download_group_id == DownloadGroupRow.id)
            .join(CoreMediaRow, DownloadRow.media_id == CoreMediaRow.id)
            .where(
                or_(
                    DownloadRow.public_id == media_public_id,
                    CoreMediaRow.public_id == media_public_id,
                ),
                DownloadGroupRow.user_id == user_id,
            )
            .order_by(DownloadRow.id.desc())
            .limit(1)
        )
        if visible_only:
            stmt = stmt.where(DownloadRow.seen.is_(False), DownloadGroupRow.seen.is_(False))
        if lock:
            stmt = stmt.with_for_update(of=DownloadRow)
        result = await session.execute(stmt)
        download: DownloadRow | None = result.scalar_one_or_none()
        if download is None:
            return Result(
                code=ResultCode.NOT_FOUND,
                message=f"No download found for media {media_public_id}",
            )
        return Result(code=ResultCode.OK, message="OK", result=download)

    @staticmethod
    @safe_async
    async def owned_download_for_cancellation_async(
        session: AsyncSession, public_id: str, user_id: int
    ) -> Result[DownloadRow]:
        """Lock the specific visible download belonging to this user."""
        download = await session.scalar(
            select(DownloadRow)
            .join(DownloadGroupRow)
            .where(
                DownloadRow.public_id == public_id,
                DownloadGroupRow.user_id == user_id,
                DownloadGroupRow.seen.is_(False),
                DownloadRow.seen.is_(False),
            )
            .with_for_update(of=DownloadRow)
        )
        if download is None:
            return Result(code=ResultCode.NOT_FOUND, message="Download not found")
        return Result(code=ResultCode.OK, message="OK", result=download)

    @staticmethod
    @safe_async
    async def get_download_status_key_async(
        session: AsyncSession, download_id: int, lock: bool = False
    ) -> Result[int]:
        """Read the current worker state, optionally locking it before finalization."""
        stmt = select(DownloadRow.status_key).where(DownloadRow.id == download_id)
        if lock:
            stmt = stmt.with_for_update()
        status = await session.scalar(stmt)
        if status is None:
            return Result(code=ResultCode.NOT_FOUND, message="Download not found")
        return Result(code=ResultCode.OK, message="OK", result=status)

    @staticmethod
    @safe_async
    async def dismiss_download_async(session: AsyncSession, download: DownloadRow) -> Result[bool]:
        """Hide a terminal download without removing rows used by the worker."""
        download.seen = True
        await session.flush()
        return Result(code=ResultCode.OK, message="OK", result=True)
