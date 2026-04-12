from logging import Logger
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.access.db.ormModels.appVersion import AppVersionRow
from backend.core.aResult import AResult, AResultCode
from backend.utils.logger import getLogger

logger: Logger = getLogger(__name__)


class AdminVersionAccess:
    @staticmethod
    async def get_latest_version_async(
        session: AsyncSession,
    ) -> AResult[AppVersionRow]:
        try:
            result = await session.execute(
                select(AppVersionRow).order_by(AppVersionRow.id.desc()).limit(1)
            )
            row = result.scalars().first()
            if row is None:
                return AResult(AResultCode.NOT_FOUND, "No versions found.", None)
            return AResult(AResultCode.OK, "OK", row)
        except Exception as e:
            logger.error(f"Error getting latest version: {e}")
            return AResult(AResultCode.GENERAL_ERROR, str(e), None)

    @staticmethod
    async def get_all_versions_async(
        session: AsyncSession,
    ) -> AResult[List[AppVersionRow]]:
        try:
            result = await session.execute(
                select(AppVersionRow).order_by(AppVersionRow.id.desc())
            )
            rows = list(result.scalars().all())
            return AResult(AResultCode.OK, "OK", rows)
        except Exception as e:
            logger.error(f"Error getting all versions: {e}")
            return AResult(AResultCode.GENERAL_ERROR, str(e), None)

    @staticmethod
    async def add_version_async(
        session: AsyncSession,
        version: str,
        apk_filename: str,
        description: Optional[str] = None,
    ) -> AResult[AppVersionRow]:
        try:
            row = AppVersionRow(
                version=version,
                apk_filename=apk_filename,
                description=description,
            )
            session.add(row)
            await session.commit()
            await session.refresh(row)
            return AResult(AResultCode.OK, "OK", row)
        except Exception as e:
            logger.error(f"Error adding version: {e}")
            await session.rollback()
            return AResult(AResultCode.GENERAL_ERROR, str(e), None)

    @staticmethod
    async def increment_downloads_async(
        session: AsyncSession,
        apk_filename: str,
    ) -> None:
        try:
            result = await session.execute(
                select(AppVersionRow).where(
                    AppVersionRow.apk_filename == apk_filename
                )
            )
            row = result.scalars().first()
            if row is not None:
                row.downloads = (row.downloads or 0) + 1
                await session.commit()
        except Exception as e:
            logger.error(f"Error incrementing downloads for {apk_filename}: {e}")
            await session.rollback()
