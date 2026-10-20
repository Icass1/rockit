from logging import Logger
from fastapi import APIRouter, Depends, HTTPException, Request

from backend.utils.logger import getLogger

from backend.core.aResult import AResult

from backend.core.middlewares.authMiddleware import AuthMiddleware
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware

from backend.core.access.db.ormModels.user import UserRow

from backend.core.responses.basePlaylistWithMediasResponse import (
    BasePlaylistWithMediasResponse,
)
from backend.core.responses.queueResponse import QueueResponse, QueueResponseItem
from backend.core.enums.queueTypeEnum import QueueTypeEnum
from backend.core.requests.collectionQueueRequest import CollectionQueueRequest
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseVideoResponse import BaseVideoResponse

from backend.featured.framework import featured

logger: Logger = getLogger(__name__)
router = APIRouter(
    prefix="/featured",
    tags=["Core", "Featured"],
    dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)],
)


@router.get("/liked")
async def get_featured_liked(
    request: Request,
) -> BasePlaylistWithMediasResponse:
    """Get the user's liked songs as a playlist."""

    session = DBSessionMiddleware.get_session(request=request)
    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        raise HTTPException(status_code=401, detail="User not authenticated")

    a_result = await featured.get_liked_playlist_async(
        session=session,
        user_id=a_result_user.result().id,
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.get("/most-listened")
async def get_featured_most_listened(
    request: Request,
) -> BasePlaylistWithMediasResponse:
    """Get the user's most listened songs as a playlist."""

    session = DBSessionMiddleware.get_session(request=request)
    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        raise HTTPException(status_code=401, detail="User not authenticated")

    a_result = await featured.get_most_listened_playlist_async(
        session=session,
        user_id=a_result_user.result().id,
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.get("/recent-mix")
async def get_featured_recent_mix(
    request: Request,
) -> BasePlaylistWithMediasResponse:
    """Get the user's recently played songs as a playlist."""

    session = DBSessionMiddleware.get_session(request=request)
    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        raise HTTPException(status_code=401, detail="User not authenticated")

    a_result = await featured.get_recent_mix_playlist_async(
        session=session,
        user_id=a_result_user.result().id,
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.get("/last-month")
async def get_featured_last_month(
    request: Request,
) -> BasePlaylistWithMediasResponse:
    """Get the user's last month top songs as a playlist."""

    session = DBSessionMiddleware.get_session(request=request)
    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        raise HTTPException(status_code=401, detail="User not authenticated")

    a_result = await featured.get_last_month_playlist_async(
        session=session,
        user_id=a_result_user.result().id,
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.get("/year-recap")
async def get_featured_year_recap(
    request: Request,
) -> BasePlaylistWithMediasResponse:
    """Get the user's last year top songs as a playlist."""

    session = DBSessionMiddleware.get_session(request=request)
    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        raise HTTPException(status_code=401, detail="User not authenticated")

    a_result = await featured.get_year_recap_playlist_async(
        session=session,
        user_id=a_result_user.result().id,
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.post("/{public_id}/queue")
async def create_featured_queue(
    request: Request, public_id: str, payload: CollectionQueueRequest
) -> QueueResponse:
    """Replace the user's queue with the current contents of a featured list."""
    session = DBSessionMiddleware.get_session(request=request)
    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        logger.error(f"Featured queue authentication failed: {a_result_user.info()}")
        raise HTTPException(status_code=401, detail="User not authenticated")

    methods = {
        "liked": featured.get_liked_playlist_async,
        "most-listened": featured.get_most_listened_playlist_async,
        "recent-mix": featured.get_recent_mix_playlist_async,
        "last-month": featured.get_last_month_playlist_async,
        "year-recap": featured.get_year_recap_playlist_async,
    }
    method = methods.get(public_id)
    if method is None:
        raise HTTPException(status_code=404, detail="Featured list not found")
    result = await method(session=session, user_id=a_result_user.result().id)
    if result.is_not_ok():
        logger.error(f"Featured queue resolution failed: {result.info()}")
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())

    playlist = result.result()
    medias = [
        item.item
        for item in playlist.medias
        if isinstance(item.item, (BaseSongWithAlbumResponse, BaseVideoResponse))
    ]
    if not medias:
        logger.warning(f"Featured list {public_id} has no queueable media")
        raise HTTPException(status_code=400, detail="Featured list contains no media")
    start = next(
        (i for i, media in enumerate(medias) if media.publicId == payload.startPublicId),
        0,
    )
    if payload.startPublicId and medias[start].publicId != payload.startPublicId:
        raise HTTPException(status_code=400, detail="Start media is not in the featured list")
    queue = [
        QueueResponseItem(
            queueMediaId=index,
            listPublicId=public_id,
            media=media,
            randomIndex=index,
            sortedIndex=index,
        )
        for index, media in enumerate(medias)
    ]
    response = QueueResponse(
        currentQueueMediaId=start, queue=queue, queueType=QueueTypeEnum.SORTED
    )
    from backend.core.framework.websocket.webSocketManager import ws_manager
    from backend.core.responses.currentQueueMessage import CurrentQueueMessage
    from backend.core.models.queueItem import QueueItem

    await ws_manager.send_to_user_async(
        user_id=a_result_user.result().id,
        message=CurrentQueueMessage(
            queue=[
                QueueItem(
                    mediaPublicId=item.media.publicId,
                    listPublicId=item.listPublicId,
                    queueMediaId=item.queueMediaId,
                    randomIndex=item.randomIndex,
                    sortedIndex=item.sortedIndex,
                )
                for item in queue
            ]
        ),
    )
    return response
