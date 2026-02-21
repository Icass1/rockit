import uuid
from datetime import datetime, timezone
from logging import Logger

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.access.db.ormModels.download import DownloadRow
from backend.core.access.db.ormModels.downloadGroup import DownloadGroupRow

logger: Logger = getLogger(__name__)


class DownloadAccess:
    @staticmethod
    async def create_download_group(
        user_id: int,
        title: str,
        session: AsyncSession,
    ) -> AResult[DownloadGroupRow]:
        """Create a new download group row and flush so its id is available."""

        try:
            row: DownloadGroupRow = DownloadGroupRow(
                public_id=str(uuid.uuid4()),
                user_id=user_id,
                title=title,
                date_started=datetime.now(timezone.utc),
            )
            session.add(row)
            await session.flush()
            return AResult(code=AResultCode.OK, message="OK", result=row)
        except Exception as e:
            logger.error(f"Error creating download group. {e}")
            return AResult(code=AResultCode.GENERAL_ERROR, message="Error creating download group")

    @staticmethod
    async def create_download(
        download_group_id: int,
        song_id: int,
        session: AsyncSession,
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
            return AResult(code=AResultCode.GENERAL_ERROR, message="Error creating download")
