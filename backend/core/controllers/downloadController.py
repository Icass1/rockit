from logging import Logger

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from backend.utils.logger import getLogger

from backend.core.aResult import AResult

from backend.core.framework import providers
from backend.core.framework.downloader.downloader import Downloader

from backend.core.middlewares.authMiddleware import AuthMiddleware

from backend.core.responses.startDownloadResponse import StartDownloadResponse
from backend.core.requests.startDownloadRequest import StartDownloadRequest

from backend.core.access.db.ormModels.user import UserRow


logger: Logger = getLogger(name=__name__)
router = APIRouter(
    prefix="/downloader",
    dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)])


@router.post("/start-downloads")
async def start_download(request: Request, response: Response, payload: StartDownloadRequest) -> StartDownloadResponse:
    """Start downloading a list of songs grouped under a single download group."""

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message())

    user: UserRow = a_result_user.result()

    a_result: AResult[StartDownloadResponse] = await Downloader.download_multiple_songs_async(
        user_id=user.id,
        title=payload.title,
        public_ids=payload.ids,
        providers=providers,
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message())

    return a_result.result()
