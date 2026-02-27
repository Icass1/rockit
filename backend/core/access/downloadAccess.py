from logging import Logger
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.backendUtils import create_id
from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.access.db.ormModels.download import DownloadRow
from backend.core.access.db.ormModels.downloadGroup import DownloadGroupRow
from backend.core.access.db.ormModels.downloadStatus import DownloadStatusRow

logger: Logger = getLogger(__name__)


class DownloadAccess:
    @staticmethod
    async def create_download_group(
        session: AsyncSession,
        user_id: int,
        title: str,
    ) -> AResult[DownloadGroupRow]:
        """Create a new download group row and flush so its id is available."""

        try:
            row: DownloadGroupRow = DownloadGroupRow(
                public_id=create_id(32),
                user_id=user_id,
                title=title,
                date_started=datetime.now(timezone.utc),
            )
            session.add(row)
            await session.flush()
            return AResult(code=AResultCode.OK, message="OK", result=row)
        except Exception as e:
            logger.error(f"Error creating download group. {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error creating download group"
            )

    @staticmethod
    async def create_download(
        session: AsyncSession,
        download_group_id: int,
        song_id: int,
    ) -> AResult[DownloadRow]:
        """Create a new download row for a single song and flush so its id is available."""

        try:
            row: DownloadRow = DownloadRow(
                download_group_id=download_group_id,
                song_id=song_id,
            )
            session.add(row)
            await session.flush()
            return AResult(code=AResultCode.OK, message="OK", result=row)
        except Exception as e:
            logger.error(f"Error creating download. {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error creating download"
            )

    @staticmethod
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
        await session.flush()
        return AResult(code=AResultCode.OK, message="OK", result=row)
