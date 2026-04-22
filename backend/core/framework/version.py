from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.access.adminVersionAccess import AdminVersionAccess
from backend.core.aResult import AResult, AResultCode
from backend.core.responses.latestVersionResponse import LatestVersionResponse
from backend.constants import BACKEND_URL


class Version:
    @staticmethod
    async def get_latest_version_async(
        session: AsyncSession,
    ) -> AResult[LatestVersionResponse]:
        a_result = await AdminVersionAccess.get_latest_version_async(session=session)
        if a_result.is_not_ok():
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
        return await AdminVersionAccess.increment_downloads_async(
            session=session,
            apk_filename=apk_filename,
        )

    @staticmethod
    async def get_latest_version_path_async(
        session: AsyncSession,
    ) -> AResult[str]:
        a_result = await AdminVersionAccess.get_latest_version_async(session=session)
        if a_result.is_not_ok():
            return AResult(
                code=a_result.code(),
                message=a_result.message(),
            )

        row = a_result.result()
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=row.apk_filename,
        )
