from logging import Logger

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from typing import Literal

from backend.utils.logger import getLogger

from backend.core.aResult import AResult
from backend.core.access.db.ormModels.user import UserRow

from backend.core.framework.downloader.downloader import Downloader
from backend.core.framework.downloader.downloadBrowser import DownloadBrowser
from backend.core.responses.downloadBrowseResponse import (
    DownloadBrowseResponse,
    DownloadItemsPageResponse,
)

from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from backend.core.middlewares.authMiddleware import AuthMiddleware

from backend.core.responses.startDownloadResponse import StartDownloadResponse
from backend.core.responses.startDownloadFromUrlResponse import (
    StartDownloadFromUrlResponse,
)
from backend.core.responses.downloadsResponse import DownloadsResponse
from backend.core.responses.okResponse import OkResponse
from backend.core.responses.downloadSettingsResponse import DownloadSettingsResponse

from backend.core.requests.startDownloadRequest import StartDownloadRequest
from backend.core.requests.addFromUrlRequest import AddFromUrlRequest

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
            add_to_library=user.auto_add_downloads_to_library,
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
            add_to_library=payload.addToLibrary or user.auto_add_downloads_to_library,
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


@router.get("/settings")
async def get_download_settings(request: Request) -> DownloadSettingsResponse:
    """Return the signed-in user's download preference."""
    user = AuthMiddleware.get_current_user(request=request)
    if user.is_not_ok():
        logger.error(f"Error getting download settings. {user.info()}")
        raise HTTPException(status_code=user.get_http_code(), detail=user.message())
    return DownloadSettingsResponse(
        autoAddToLibrary=user.result().auto_add_downloads_to_library
    )


@router.post("/settings")
async def update_download_settings(
    request: Request, payload: DownloadSettingsResponse
) -> OkResponse:
    """Persist the download preference across devices."""
    user = AuthMiddleware.get_current_user(request=request)
    if user.is_not_ok():
        logger.error(f"Error updating download settings. {user.info()}")
        raise HTTPException(status_code=user.get_http_code(), detail=user.message())
    result = await Downloader.update_settings_async(
        session=DBSessionMiddleware.get_session(request=request),
        user=user.result(),
        auto_add=payload.autoAddToLibrary,
    )
    if result.is_not_ok():
        logger.error(f"Error saving download settings. {result.info()}")
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())
    return OkResponse()


@router.delete("/downloads/{public_id}")
async def delete_download(request: Request, public_id: str) -> OkResponse:
    """Delete a terminal download file and hide its history entry."""
    user = AuthMiddleware.get_current_user(request=request)
    if user.is_not_ok():
        logger.error(f"Error authenticating download deletion. {user.info()}")
        raise HTTPException(status_code=user.get_http_code(), detail=user.message())
    result = await Downloader.delete_download_async(
        session=DBSessionMiddleware.get_session(request=request),
        user_id=user.result().id,
        public_id=public_id,
    )
    if result.is_not_ok():
        logger.error(f"Error deleting download. {result.info()}")
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())
    return OkResponse()


@router.get("/browse")
async def browse_downloads(
    request: Request,
    page: int = Query(default=0, ge=0, le=100000),
    status: Literal["all", "active", "completed", "failed"] = "all",
    kind: Literal["all", "album", "playlist"] = "all",
    q: str = Query(default="", max_length=200),
) -> DownloadBrowseResponse:
    """Browse a bounded page; counts describe the complete download history."""
    user = AuthMiddleware.get_current_user(request=request)
    if user.is_not_ok():
        logger.error(f"Download browsing authentication failed: {user.info()}")
        raise HTTPException(status_code=user.get_http_code(), detail=user.message())
    result = await DownloadBrowser.page_async(
        session=DBSessionMiddleware.get_session(request=request),
        user_id=user.result().id,
        page=page,
        status=status,
        kind=kind,
        query=q.strip(),
    )
    if result.is_not_ok():
        logger.error(f"Download browsing failed: {result.info()}")
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())
    return result.result()


@router.get("/groups/{public_id}/items")
async def browse_download_group_items(
    request: Request,
    public_id: str,
    offset: int = Query(default=0, ge=0, le=10000000),
    status: Literal["all", "active", "completed", "failed"] = "all",
    q: str = Query(default="", max_length=200),
) -> DownloadItemsPageResponse:
    """Load one track page without expanding the rest of the history."""
    user = AuthMiddleware.get_current_user(request=request)
    if user.is_not_ok():
        logger.error(f"Download item authentication failed: {user.info()}")
        raise HTTPException(status_code=user.get_http_code(), detail=user.message())
    result = await DownloadBrowser.items_async(
        session=DBSessionMiddleware.get_session(request=request),
        user_id=user.result().id,
        public_id=public_id,
        offset=offset,
        status=status,
        query=q.strip(),
    )
    if result.is_not_ok():
        logger.error(f"Download items failed: {result.info()}")
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())
    return result.result()


@router.post("/groups/{public_id}/{action}")
async def manage_download_group(
    request: Request, public_id: str, action: Literal["retry", "delete", "library"]
) -> OkResponse:
    """Manage a complete download group, including its library membership."""
    user = AuthMiddleware.get_current_user(request=request)
    if user.is_not_ok():
        logger.error(f"Download group action authentication failed: {user.info()}")
        raise HTTPException(status_code=user.get_http_code(), detail=user.message())
    result = await DownloadBrowser.group_action_async(
        session=DBSessionMiddleware.get_session(request=request),
        user_id=user.result().id,
        public_id=public_id,
        action=action,
    )
    if result.is_not_ok():
        logger.error(f"Download group action failed: {result.info()}")
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())
    return OkResponse()
