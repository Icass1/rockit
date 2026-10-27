from logging import Logger
from urllib.parse import quote

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.adminVersionAccess import AdminVersionAccess
from core.access.db.ormModels.appVersion import AppVersionRow
from core.framework.objectFiles import ObjectFiles
from core.framework.version import Version
from core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from core.responses.latestVersionResponse import LatestVersionResponse
from logger import getLogger
from result import Result

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
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    return a_result.result()


@router.get("/apk/{filename}")
async def download_apk(request: Request, filename: str) -> StreamingResponse:
    session = DBSessionMiddleware.get_session(request=request)
    version = await AdminVersionAccess.get_version_by_filename_async(
        session=session, filename=filename
    )
    if version.is_not_ok():
        raise HTTPException(status_code=version.get_http_code(), detail=version.message())
    response = await ObjectFiles.stream_async(
        key=version.result().storage_object.key, range_header=request.headers.get("range")
    )
    if response.is_not_ok():
        raise HTTPException(status_code=response.get_http_code(), detail=response.message())
    response.result().headers["Content-Disposition"] = (
        f"attachment; filename*=UTF-8''{quote(filename, safe='')}"
    )
    await Version.increment_downloads_async(session=session, apk_filename=filename)
    return response.result()


@router.get("/latest/apk")
async def download_latest_apk(request: Request) -> StreamingResponse:
    """Endpoint to download the latest APK file."""
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: Result[AppVersionRow] = await Version.get_latest_version_path_async(session=session)
    if a_result.is_not_ok():
        logger.error(f"Error fetching latest version. {a_result.info()}")
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())
    version_row: AppVersionRow = a_result.result()

    return await download_apk(request=request, filename=version_row.apk_filename)
