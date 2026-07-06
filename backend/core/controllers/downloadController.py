from logging import Logger

from fastapi import APIRouter, Depends, HTTPException, Request

from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from backend.utils.logger import getLogger

from backend.core.aResult import AResult

from backend.core.framework.downloader.downloader import Downloader

from backend.core.middlewares.authMiddleware import AuthMiddleware

from backend.core.responses.startDownloadResponse import StartDownloadResponse
from backend.core.responses.startDownloadFromUrlResponse import (
    StartDownloadFromUrlResponse,
)
from backend.core.responses.downloadsResponse import DownloadsResponse
from backend.core.responses.okResponse import OkResponse
from backend.core.requests.startDownloadRequest import StartDownloadRequest
from backend.core.requests.addFromUrlRequest import AddFromUrlRequest

from backend.core.access.db.ormModels.user import UserRow

logger: Logger = getLogger(name=__name__)
router = APIRouter(
    prefix="/downloader",
    dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)],
    tags=["Core", "Download"],
)


@router.post("/start-downloads")
async def start_download(
    request: Request, payload: StartDownloadRequest
) -> StartDownloadResponse:
    """Start downloading a list of songs grouped under a single download group."""

    session = DBSessionMiddleware.get_session(request=request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    user: UserRow = a_result_user.result()

    a_result: AResult[StartDownloadResponse] = (
        await Downloader.download_multiple_medias_async(
            session=session,
            user_id=user.id,
            title=payload.title,
            public_ids=payload.ids,
        )
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.post("/start-from-url")
async def start_download_from_url(
    request: Request, payload: AddFromUrlRequest
) -> StartDownloadFromUrlResponse:
    """Add media from a URL and immediately queue its download, atomically,
    so the download starts even if the client disconnects right after."""

    session = DBSessionMiddleware.get_session(request=request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    user: UserRow = a_result_user.result()

    a_result: AResult[StartDownloadFromUrlResponse] = (
        await Downloader.start_download_from_url_async(
            session=session,
            user_id=user.id,
            url=payload.url,
            add_to_library=payload.addToLibrary,
            add_to_playlist=payload.addToPlaylist,
            playlist_public_id=payload.playlistPublicId,
        )
    )
    if a_result.is_not_ok():
        logger.error(f"Error starting download from URL. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.get("/downloads")
async def get_downloads(request: Request) -> DownloadsResponse:
    """Get all downloads for the current user."""

    session = DBSessionMiddleware.get_session(request=request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    user: UserRow = a_result_user.result()

    a_result: AResult[DownloadsResponse] = await Downloader.get_downloads_async(
        session=session, user_id=user.id
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.post("/downloads/{public_id}/retry")
async def retry_download(request: Request, public_id: str) -> OkResponse:
    """Reset a failed download and re-queue it for retry."""

    session = DBSessionMiddleware.get_session(request=request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    user: UserRow = a_result_user.result()

    a_result: AResult[bool] = await Downloader.retry_download_async(
        session=session, user_id=user.id, public_id=public_id
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse()


@router.get("/downloads/{public_id}/seen")
async def mark_download_seen(request: Request, public_id: str) -> OkResponse:
    """Mark a download as seen (delete the download group)."""

    session = DBSessionMiddleware.get_session(request=request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    user: UserRow = a_result_user.result()

    a_result: AResult[bool] = await Downloader.mark_download_seen_async(
        session=session, user_id=user.id, public_id=public_id
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse()
