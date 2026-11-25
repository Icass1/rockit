import shutil
from logging import Logger
from urllib.parse import quote

from fastapi import APIRouter, HTTPException, Path, Query, Request, Response
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.background import BackgroundTask

from core.access.adminVersionAccess import AdminVersionAccess
from core.access.db.ormModels.appVersion import AppVersionRow
from core.framework.admin.androidBuildDownload import AndroidBuildDownloads
from core.framework.admin.androidBuildShare import valid_share
from core.framework.androidRelease import AndroidRelease
from core.framework.objectFiles import ObjectFiles
from core.framework.version import Version
from core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from core.responses.androidBuildResponse import LatestAndroidReleaseResponse
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


@router.get("/android/latest")
async def get_latest_android_release(response: Response) -> LatestAndroidReleaseResponse:
    response.headers["Cache-Control"] = "no-store"
    result = await AndroidRelease.latest_async()
    if result.is_not_ok():
        logger.warning("Android release lookup failed: %s", result.info())
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())
    return result.result()


@router.get("/android/{run_id}/apk")
async def download_shared_android_build(
    run_id: int = Path(ge=1),
    artifact: int = Query(ge=1),
    expires: int = Query(ge=1),
    token: str = Query(pattern=r"^[0-9a-f]{64}$"),
) -> FileResponse:
    if not valid_share(run_id=run_id, artifact_id=artifact, expires=expires, token=token):
        logger.info("Invalid or expired Android build share for run %s", run_id)
        raise HTTPException(status_code=404, detail="APK link is invalid or expired")
    result = await AndroidBuildDownloads.create_async(run_id=run_id, artifact_id=artifact)
    if result.is_not_ok():
        logger.warning("Shared Android build download failed: %s", result.info())
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())
    download = result.result()
    return FileResponse(
        path=download.path,
        filename=download.filename,
        media_type="application/vnd.android.package-archive",
        headers={"Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer"},
        background=BackgroundTask(shutil.rmtree, download.directory, ignore_errors=True),
    )
