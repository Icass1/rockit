from fastapi.responses import Response
from backend.core.framework.storage import Storage

from fastapi import APIRouter, HTTPException, Request
from logging import Logger
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

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


@router.api_route("/apk/{filename}", methods=["GET", "HEAD"])
async def download_apk(request: Request, filename: str) -> Response:
    session = DBSessionMiddleware.get_session(request=request)
    found = await Version.get_by_filename_async(session=session, filename=filename)
    if found.is_not_ok():
        logger.error(found.info())
        raise HTTPException(status_code=found.get_http_code(), detail=found.message())
    streamed = await Storage.stream_async(
        storage_object=found.result().storage_object,
        range_header=request.headers.get("range"),
        head_only=request.method == "HEAD",
        filename=filename,
    )
    if streamed.is_not_ok():
        logger.error(streamed.info())
        raise HTTPException(
            status_code=streamed.get_http_code(), detail=streamed.message()
        )
    if request.method != "HEAD":
        await Version.increment_downloads_async(session=session, apk_filename=filename)
    return streamed.result()


@router.api_route("/latest/apk", methods=["GET", "HEAD"])
async def download_latest_apk(request: Request) -> Response:
    session = DBSessionMiddleware.get_session(request=request)
    found = await Version.get_latest_version_path_async(session=session)
    if found.is_not_ok():
        logger.error(found.info())
        raise HTTPException(status_code=found.get_http_code(), detail=found.message())
    return await download_apk(request=request, filename=found.result().apk_filename)
