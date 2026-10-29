from sqlalchemy.ext.asyncio import AsyncSession

from constants import BACKEND_URL
from core.access.adminVersionAccess import AdminVersionAccess
from core.access.db.ormModels.appVersion import AppVersionRow
from core.responses.latestVersionResponse import LatestVersionResponse
from logger import getLogger
from result import Result, ResultCode

logger = getLogger(__name__)


class Version:
    @staticmethod
    async def get_latest_version_async(
        session: AsyncSession,
    ) -> Result[LatestVersionResponse]:
        a_result = await AdminVersionAccess.get_latest_version_async(session=session)
        if a_result.is_not_ok():
            logger.error(f"Error getting latest version. {a_result.info()}")
            return Result(
                code=a_result.code(),
                message=a_result.message(),
            )

        row = a_result.result()
        apk_url = f"{BACKEND_URL}/version/apk/{row.apk_filename}"
        return Result(
            code=ResultCode.OK,
            message="OK",
            result=LatestVersionResponse(version=row.version, apkUrl=apk_url),
        )

    @staticmethod
    async def increment_downloads_async(
        session: AsyncSession,
        apk_filename: str,
    ) -> ResultCode:
        a_result = await AdminVersionAccess.increment_downloads_async(
            session=session,
            apk_filename=apk_filename,
        )
        if a_result.is_not_ok():
            logger.error(f"Error incrementing downloads. {a_result.info()}")
        return a_result

    @staticmethod
    async def get_latest_version_path_async(
        session: AsyncSession,
    ) -> Result[AppVersionRow]:
        a_result = await AdminVersionAccess.get_latest_version_async(session=session)
        if a_result.is_not_ok():
            logger.error(f"Error getting latest version path. {a_result.info()}")
            return Result(
                code=a_result.code(),
                message=a_result.message(),
            )

        row: AppVersionRow = a_result.result()
        return Result(
            code=ResultCode.OK,
            message="OK",
            result=row,
        )
