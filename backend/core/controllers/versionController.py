import os

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse
from logging import Logger
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.constants import BUILDS_PATH

from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware

from backend.core.framework.version import Version

from backend.core.responses.latestVersionResponse import LatestVersionResponse

logger: Logger = getLogger(__name__)

router = APIRouter(
    prefix="/version",
    tags=["Version"],
)


@router.get("/latest")
async def get_latest_version(request: Request) -> LatestVersionResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result = await Version.get_latest_version_async(session=session)

    if a_result.is_not_ok():
        logger.error(f"Error fetching latest version. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.get("/apk/{filename}")
async def download_apk(request: Request, filename: str) -> FileResponse:
    apk_path = os.path.join(BUILDS_PATH, filename)

    if not os.path.exists(apk_path):
        raise HTTPException(status_code=404, detail="APK file not found.")

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    await Version.increment_downloads_async(session=session, apk_filename=filename)

    return FileResponse(
        path=apk_path,
        media_type="application/vnd.android.package-archive",
        filename=filename,
    )


@router.get("/latest/apk")
async def download_latest_apk(request: Request) -> FileResponse:
    """Endpoint to download the latest APK file."""
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result = await Version.get_latest_version_path_async(session=session)
    if a_result.is_not_ok():
        logger.error(f"Error fetching latest version. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )
    latest_version: str = a_result.result()

    apk_path = os.path.join(BUILDS_PATH, latest_version)

    if not os.path.exists(apk_path):
        raise HTTPException(status_code=404, detail="APK file not found.")

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    await Version.increment_downloads_async(session=session, apk_filename=apk_path)

    return FileResponse(
        path=apk_path,
        media_type="application/vnd.android.package-archive",
        filename=apk_path,
    )
