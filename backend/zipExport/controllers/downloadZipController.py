import os

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

from backend.utils.logger import getLogger
from backend.core.aResult import AResult
from backend.core.access.db.ormModels.user import UserRow
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from backend.core.middlewares.authMiddleware import AuthMiddleware
from backend.zipExport.framework.downloadZip import DownloadZip
from backend.zipExport.requests.downloadZipRequest import DownloadZipRequest

logger = getLogger(name=__name__)
router = APIRouter(
    prefix="/downloader",
    dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)],
    tags=["Download ZIP"],
)


@router.post("/download-zip")
async def download_zip(request: Request, payload: DownloadZipRequest) -> FileResponse:
    """Create and return a ZIP containing downloaded requested media."""
    session = DBSessionMiddleware.get_session(request=request)
    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        logger.error(f"Error authenticating ZIP export. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    result = await DownloadZip.create_async(
        session=session,
        user_id=a_result_user.result().id,
        public_ids=payload.ids,
        title=payload.title,
    )
    if result.is_not_ok():
        logger.error(f"Error creating ZIP. {result.info()}")
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())

    zip_path = result.result()
    return FileResponse(
        path=zip_path,
        media_type="application/zip",
        filename=f"{payload.title}.zip",
        background=BackgroundTask(os.unlink, zip_path),
    )
