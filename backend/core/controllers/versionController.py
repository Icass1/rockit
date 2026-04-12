import os

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from logging import Logger
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.access.adminVersionAccess import AdminVersionAccess
from backend.core.responses.latestVersionResponse import LatestVersionResponse
from backend.constants import BACKEND_URL, BUILDS_PATH
from backend.core.aResult import AResultCode
from backend.core.middlewares.authMiddleware import AuthMiddleware
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from backend.utils.logger import getLogger

logger: Logger = getLogger(__name__)

router = APIRouter(
    prefix="/version",
    tags=["Version"],
    dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)],
)


@router.get("/latest")
async def get_latest_version(request: Request) -> LatestVersionResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result = await AdminVersionAccess.get_latest_version_async(session=session)

    if a_result.code() == AResultCode.NOT_FOUND:
        raise HTTPException(status_code=404, detail="No versions available.")

    if a_result.is_not_ok():
        logger.error(f"Error fetching latest version. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    row = a_result.result()
    apk_url = f"{BACKEND_URL}/version/apk/{row.apk_filename}"
    return LatestVersionResponse(version=row.version, apkUrl=apk_url)


@router.get("/apk/{filename}")
async def download_apk(request: Request, filename: str) -> FileResponse:
    apk_path = os.path.join(BUILDS_PATH, filename)

    if not os.path.exists(apk_path):
        raise HTTPException(status_code=404, detail="APK file not found.")

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    await AdminVersionAccess.increment_downloads_async(
        session=session, apk_filename=filename
    )

    return FileResponse(
        path=apk_path,
        media_type="application/vnd.android.package-archive",
        filename=filename,
    )
