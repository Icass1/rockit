from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

logger = getLogger(__name__)

from backend.constants import BACKEND_URL
from backend.core.aResult import AResult, AResultCode
from backend.core.access.adminVersionAccess import AdminVersionAccess
from backend.core.access.db.ormModels.appVersion import AppVersionRow
from backend.core.responses.latestVersionResponse import LatestVersionResponse


class Version:
    @staticmethod
    async def get_latest_version_async(
        session: AsyncSession,
    ) -> AResult[LatestVersionResponse]:
        a_result = await AdminVersionAccess.get_latest_version_async(session=session)
        if a_result.is_not_ok():
            logger.error(f"Error getting latest version. {a_result.info()}")
            return AResult(
                code=a_result.code(),
                message=a_result.message(),
            )

        row = a_result.result()
        apk_url = f"{BACKEND_URL}/version/apk/{row.apk_filename}"
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=LatestVersionResponse(version=row.version, apkUrl=apk_url),
        )

    @staticmethod
    async def increment_downloads_async(
        session: AsyncSession,
        apk_filename: str,
    ) -> AResultCode:
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
    ) -> AResult[AppVersionRow]:
        a_result = await AdminVersionAccess.get_latest_version_async(session=session)
        if a_result.is_not_ok():
            logger.error(f"Error getting latest version path. {a_result.info()}")
            return AResult(
                code=a_result.code(),
                message=a_result.message(),
            )

        row: AppVersionRow = a_result.result()
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=row,
        )
