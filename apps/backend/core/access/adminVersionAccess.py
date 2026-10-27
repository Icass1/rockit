from logging import Logger

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.appVersion import AppVersionRow
from core.aResult import AResult, AResultCode
from core.utils.createId import create_id
from core.utils.safeAsyncCall import safe_async
from logger import getLogger

logger: Logger = getLogger(__name__)


class AdminVersionAccess:
    @staticmethod
    @safe_async
    async def get_latest_version_async(
        session: AsyncSession,
    ) -> AResult[AppVersionRow]:
        result = await session.execute(
            select(AppVersionRow).order_by(AppVersionRow.id.desc()).limit(1)
        )
        row = result.scalars().first()
        if row is None:
            return AResult(AResultCode.NOT_FOUND, "No versions found.", None)
        return AResult(AResultCode.OK, "OK", row)

    @staticmethod
    @safe_async
    async def get_all_versions_async(
        session: AsyncSession,
    ) -> AResult[list[AppVersionRow]]:
        result = await session.execute(select(AppVersionRow).order_by(AppVersionRow.id.desc()))
        rows = list(result.scalars().all())
        return AResult(AResultCode.OK, "OK", rows)

    @staticmethod
    @safe_async
    async def add_version_async(
        session: AsyncSession,
        version: str,
        apk_filename: str,
        description: str | None = None,
    ) -> AResult[AppVersionRow]:
        row = AppVersionRow(
            version=version,
            apk_filename=apk_filename,
            description=description,
            public_id=create_id(32),
        )
        session.add(row)
        await session.commit()
        await session.refresh(row)
        return AResult(code=AResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def increment_downloads_async(
        session: AsyncSession,
        apk_filename: str,
    ) -> AResultCode:
        result = await session.execute(
            select(AppVersionRow).where(AppVersionRow.apk_filename == apk_filename)
        )
        row: AppVersionRow | None = result.scalars().first()
        if row is not None:
            row.downloads = (row.downloads or 0) + 1
            await session.commit()

        return AResultCode(AResultCode.OK, message="OK")
