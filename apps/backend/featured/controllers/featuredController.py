from logging import Logger

from fastapi import APIRouter, Depends, HTTPException, Request

from core.access.db.ormModels.user import UserRow
from core.enums.queueTypeEnum import QueueTypeEnum
from core.framework.media.media import Media
from core.framework.models.queue import QueueItem as FrameworkQueueItem
from core.framework.user.user import User
from core.middlewares.authMiddleware import AuthMiddleware
from core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from core.requests.collectionQueueRequest import CollectionQueueRequest
from core.responses.basePlaylistWithMediasResponse import (
    BasePlaylistWithMediasResponse,
)
from core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from core.responses.baseVideoResponse import BaseVideoResponse
from core.responses.queueResponse import QueueResponse, QueueResponseItem
from featured.framework import featured
from logger import getLogger
from result import Result

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
    a_result_user: Result[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        raise HTTPException(status_code=401, detail="User not authenticated")

    a_result = await featured.get_liked_playlist_async(
        session=session,
        user_id=a_result_user.result().id,
    )
    if a_result.is_not_ok():
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    return a_result.result()


@router.get("/most-listened")
async def get_featured_most_listened(
    request: Request,
) -> BasePlaylistWithMediasResponse:
    """Get the user's most listened songs as a playlist."""

    session = DBSessionMiddleware.get_session(request=request)
    a_result_user: Result[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        raise HTTPException(status_code=401, detail="User not authenticated")

    a_result = await featured.get_most_listened_playlist_async(
        session=session,
        user_id=a_result_user.result().id,
    )
    if a_result.is_not_ok():
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    return a_result.result()


@router.get("/recent-mix")
async def get_featured_recent_mix(
    request: Request,
) -> BasePlaylistWithMediasResponse:
    """Get the user's recently played songs as a playlist."""

    session = DBSessionMiddleware.get_session(request=request)
    a_result_user: Result[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        raise HTTPException(status_code=401, detail="User not authenticated")

    a_result = await featured.get_recent_mix_playlist_async(
        session=session,
        user_id=a_result_user.result().id,
    )
    if a_result.is_not_ok():
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    return a_result.result()


@router.get("/last-month")
async def get_featured_last_month(
    request: Request,
) -> BasePlaylistWithMediasResponse:
    """Get the user's last month top songs as a playlist."""

    session = DBSessionMiddleware.get_session(request=request)
    a_result_user: Result[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        raise HTTPException(status_code=401, detail="User not authenticated")

    a_result = await featured.get_last_month_playlist_async(
        session=session,
        user_id=a_result_user.result().id,
    )
    if a_result.is_not_ok():
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    return a_result.result()


@router.get("/year-recap")
async def get_featured_year_recap(
    request: Request,
) -> BasePlaylistWithMediasResponse:
    """Get the user's last year top songs as a playlist."""

    session = DBSessionMiddleware.get_session(request=request)
    a_result_user: Result[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        raise HTTPException(status_code=401, detail="User not authenticated")

    a_result = await featured.get_year_recap_playlist_async(
        session=session,
        user_id=a_result_user.result().id,
    )
    if a_result.is_not_ok():
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    return a_result.result()


@router.post("/{public_id}/queue")
async def create_featured_queue(
    request: Request, public_id: str, payload: CollectionQueueRequest
) -> QueueResponse:
    """Replace the user's queue with the current contents of a featured list."""
    session = DBSessionMiddleware.get_session(request=request)
    a_result_user: Result[UserRow] = AuthMiddleware.get_current_user(request=request)
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

    media_result = await Media.get_medias_from_public_ids_async(
        session=session,
        public_ids=[media.publicId for media in medias],
        media_type_keys=None,
    )
    if media_result.is_not_ok():
        logger.error(f"Featured queue media lookup failed: {media_result.info()}")
        raise HTTPException(status_code=media_result.get_http_code(), detail=media_result.message())
    media_ids = {item.public_id: item.id for item in media_result.result()}
    if any(media.publicId not in media_ids for media in medias):
        logger.error(f"Featured queue {public_id} contains unavailable media")
        raise HTTPException(status_code=404, detail="Featured queue media unavailable")

    saved = await User.save_user_queue_async(
        session=session,
        user_id=a_result_user.result().id,
        queue_items=[
            FrameworkQueueItem(
                media_id=media_ids[item.media.publicId],
                queue_id=item.queueMediaId,
                list_id=None,
                sorted_index=item.sortedIndex,
                random_index=item.randomIndex,
            )
            for item in queue
        ],
    )
    if saved.is_not_ok():
        logger.error(f"Featured queue save failed: {saved.info()}")
        raise HTTPException(status_code=saved.get_http_code(), detail=saved.message())

    current_media = await User.update_user_current_media(
        session=session,
        user_id=a_result_user.result().id,
        queue_id=start,
        media_public_id=medias[start].publicId,
    )
    if current_media.is_not_ok():
        logger.error(f"Featured current media update failed: {current_media.info()}")
        raise HTTPException(
            status_code=current_media.get_http_code(), detail=current_media.message()
        )

    response = QueueResponse(currentQueueMediaId=start, queue=queue, queueType=QueueTypeEnum.SORTED)
    from core.framework.websocket.webSocketManager import ws_manager
    from core.models.queueItem import QueueItem
    from core.responses.currentQueueMessage import CurrentQueueMessage

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
