from logging import Logger
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.utils.safeAsyncCall import safe_async
from backend.utils.backendUtils import create_id
from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode
from backend.core.enums.downloadStatusEnum import DownloadStatusEnum

from backend.core.access.db.ormModels.download import DownloadRow
from backend.core.access.db.ormModels.downloadGroup import DownloadGroupRow
from backend.core.access.db.ormModels.downloadStatus import DownloadStatusRow

logger: Logger = getLogger(__name__)


class DownloadAccess:
    @staticmethod
    @safe_async
    async def create_download_group(
        session: AsyncSession,
        user_id: int,
        title: str,
    ) -> AResult[DownloadGroupRow]:
        """Create a new download group row and flush so its id is available."""

        row: DownloadGroupRow = DownloadGroupRow(
            public_id=create_id(32),
            user_id=user_id,
            title=title,
            date_started=datetime.now(timezone.utc),
        )
        session.add(row)
        await session.flush()
        return AResult(code=AResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def create_download(
        session: AsyncSession,
        download_group_id: int,
        song_id: int,
    ) -> AResult[DownloadRow]:
        """Create a new download row for a single song and flush so its id is available."""

        result = await session.execute(
            select(DownloadRow)
            .where(DownloadRow.media_id == song_id)
            .where(DownloadRow.download_group_id == download_group_id)
        )
        existing = result.scalar_one_or_none()
        if existing:
            return AResult(code=AResultCode.OK, message="OK", result=existing)

        result_any = await session.execute(
            select(DownloadRow)
            .where(DownloadRow.media_id == song_id)
            .where(DownloadRow.status_key == 3)
        )
        existing_completed = result_any.scalar_one_or_none()
        if existing_completed:
            return AResult(
                code=AResultCode.ALREADY_EXISTS,
                message="Download already exists for this media",
                result=existing_completed,
            )

        result_pending = await session.execute(
            select(DownloadRow).where(DownloadRow.media_id == song_id)
        )
        existing_pending = result_pending.scalar_one_or_none()
        if existing_pending:
            return AResult(code=AResultCode.OK, message="OK", result=existing_pending)

        row: DownloadRow = DownloadRow(
            download_group_id=download_group_id,
            media_id=song_id,
        )
        session.add(row)
        await session.flush()
        return AResult(code=AResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def create_download_status(
        session: AsyncSession,
        download_id: int,
        completed: float,
        message: str,
    ) -> AResult[DownloadStatusRow]:
        """Insert a new row in DownloadStatusRow and flush so its id is available."""

        row: DownloadStatusRow = DownloadStatusRow(
            download_id=download_id,
            completed=round(float(completed), 2),
            message=message,
        )
        session.add(row)

        result = await session.execute(
            select(DownloadRow).where(DownloadRow.id == download_id)
        )
        download_row: DownloadRow = result.scalar_one_or_none()
        if download_row:
            download_row.completed = round(float(completed), 2)

        return AResult(code=AResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def update_download_group_completion(
        session: AsyncSession,
        download_group_id: int,
    ) -> AResult[DownloadGroupRow]:
        """Update download group with success/fail counts and date_ended."""

        result = await session.execute(
            select(DownloadRow).where(
                DownloadRow.download_group_id == download_group_id
            )
        )
        downloads: list[DownloadRow] = list(result.scalars().all())

        success_count: int = 0
        fail_count: int = 0
        for download in downloads:
            if download.status_key == DownloadStatusEnum.COMPLETED.value:
                success_count += 1
            elif download.status_key == DownloadStatusEnum.FAILED.value:
                fail_count += 1

        result_group = await session.execute(
            select(DownloadGroupRow).where(DownloadGroupRow.id == download_group_id)
        )
        group: DownloadGroupRow | None = result_group.scalar_one_or_none()
        if group is None:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Download group {download_group_id} not found",
            )

        group.date_ended = datetime.now(timezone.utc)
        group.success = success_count
        group.fail = fail_count

        if fail_count > 0:
            group.status_key = DownloadStatusEnum.FAILED.value
        else:
            group.status_key = DownloadStatusEnum.COMPLETED.value

        return AResult(code=AResultCode.OK, message="OK", result=group)

    @staticmethod
    @safe_async
    async def update_download_status(
        session: AsyncSession,
        download_id: int,
        status_key: int,
    ) -> AResult[DownloadRow]:
        """Update the status_key of a download row."""

        result = await session.execute(
            select(DownloadRow).where(DownloadRow.id == download_id)
        )
        download: DownloadRow | None = result.scalar_one_or_none()
        if download is None:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Download {download_id} not found",
            )

        download.status_key = status_key
        return AResult(code=AResultCode.OK, message="OK", result=download)

    @staticmethod
    @safe_async
    async def get_download_groups_by_user_id(
        session: AsyncSession,
        user_id: int,
    ) -> AResult[list[DownloadGroupRow]]:
        """Get all download groups for a user, ordered by most recent first."""

        result = await session.execute(
            select(DownloadGroupRow)
            .where(DownloadGroupRow.user_id == user_id)
            .order_by(DownloadGroupRow.date_started.desc())
        )
        groups: list[DownloadGroupRow] = list(result.scalars().all())
        return AResult(code=AResultCode.OK, message="OK", result=groups)

    @staticmethod
    @safe_async
    async def get_downloads_by_group_id(
        session: AsyncSession,
        download_group_id: int,
    ) -> AResult[list[DownloadRow]]:
        """Get all download rows for a download group."""

        result = await session.execute(
            select(DownloadRow).where(
                DownloadRow.download_group_id == download_group_id
            )
        )
        downloads: list[DownloadRow] = list(result.scalars().all())
        return AResult(code=AResultCode.OK, message="OK", result=downloads)

    @staticmethod
    @safe_async
    async def get_downloads_by_group_id_with_status(
        session: AsyncSession,
        download_group_id: int,
    ) -> AResult[list[DownloadRow]]:
        """Get all download rows for a download group with their status list."""

        result = await session.execute(
            select(DownloadRow)
            .options(selectinload(DownloadRow.download_status_list))
            .where(DownloadRow.download_group_id == download_group_id)
        )
        downloads: list[DownloadRow] = list(result.scalars().all())
        return AResult(code=AResultCode.OK, message="OK", result=downloads)

    @staticmethod
    @safe_async
    async def get_download_group_by_public_id(
        session: AsyncSession,
        public_id: str,
        user_id: int,
    ) -> AResult[DownloadGroupRow]:
        """Get a download group by public_id, scoped to a user."""

        result = await session.execute(
            select(DownloadGroupRow).where(
                DownloadGroupRow.public_id == public_id,
                DownloadGroupRow.user_id == user_id,
            )
        )
        group: DownloadGroupRow | None = result.scalar_one_or_none()
        if group is None:
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="Download group not found",
            )
        return AResult(code=AResultCode.OK, message="OK", result=group)

    @staticmethod
    @safe_async
    async def delete_download_group_with_downloads(
        session: AsyncSession,
        group: DownloadGroupRow,
    ) -> AResult[bool]:
        """Delete a download group and all its child downloads."""

        result = await session.execute(
            select(DownloadRow).where(DownloadRow.download_group_id == group.id)
        )
        downloads: list[DownloadRow] = list(result.scalars().all())
        for download in downloads:
            await session.delete(download)

        await session.delete(group)
        return AResult(code=AResultCode.OK, message="OK", result=True)
