from fastapi import APIRouter, Depends, HTTPException, Query, Request

from core.framework.media.collection import Collection
from core.middlewares.authMiddleware import AuthMiddleware
from core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from core.requests.collectionQueueRequest import CollectionQueueRequest
from core.responses.collectionPageResponse import CollectionPageResponse
from core.responses.queueResponse import QueueResponse
from logger import getLogger

logger = getLogger(__name__)
router = APIRouter(
    prefix="/media/collection",
    tags=["Core", "Collections"],
    dependencies=[Depends(AuthMiddleware.auth_dependency)],
)


@router.get("/{public_id}/items")
async def get_collection_items(
    request: Request,
    public_id: str,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
    query: str = Query(default="", max_length=200),
) -> CollectionPageResponse:
    """Get bounded direct children, or search all accessible descendants."""
    user = AuthMiddleware.get_current_user(request=request)
    if user.is_not_ok():
        logger.error(f"Collection authentication failed: {user.info()}")
        raise HTTPException(status_code=user.get_http_code(), detail=user.message())
    result = await Collection.page_async(
        session=DBSessionMiddleware.get_session(request=request),
        public_id=public_id,
        user_id=user.result().id,
        offset=offset,
        limit=limit,
        query=query,
    )
    if result.is_not_ok():
        logger.error(f"Collection request failed: {result.info()}")
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())
    return result.result()


@router.post("/{public_id}/queue")
async def create_collection_queue(
    request: Request, public_id: str, payload: CollectionQueueRequest
) -> QueueResponse:
    """Replace the user's queue with the complete collection, including closed lists."""
    user = AuthMiddleware.get_current_user(request=request)
    if user.is_not_ok():
        logger.error(f"Queue authentication failed: {user.info()}")
        raise HTTPException(status_code=user.get_http_code(), detail=user.message())
    result = await Collection.queue_async(
        session=DBSessionMiddleware.get_session(request=request),
        public_id=public_id,
        user_id=user.result().id,
        start_public_id=payload.startPublicId,
    )
    if result.is_not_ok():
        logger.error(f"Queue creation failed: {result.info()}")
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())
    from core.framework.websocket.webSocketManager import ws_manager
    from core.models.queueItem import QueueItem
    from core.responses.currentQueueMessage import CurrentQueueMessage

    queue = result.result()
    await ws_manager.send_to_user_async(
        user_id=user.result().id,
        message=CurrentQueueMessage(
            queue=[
                QueueItem(
                    mediaPublicId=item.media.publicId,
                    listPublicId=item.listPublicId,
                    queueMediaId=item.queueMediaId,
                    randomIndex=item.randomIndex,
                    sortedIndex=item.sortedIndex,
                )
                for item in queue.queue
            ]
        ),
    )
    return queue


@router.get("/{public_id}/playable")
async def resolve_collection_queue(request: Request, public_id: str) -> QueueResponse:
    """Resolve all queueable contents for adding a list to an existing queue."""
    user = AuthMiddleware.get_current_user(request=request)
    if user.is_not_ok():
        logger.error(f"Queue authentication failed: {user.info()}")
        raise HTTPException(status_code=user.get_http_code(), detail=user.message())
    result = await Collection.queue_async(
        session=DBSessionMiddleware.get_session(request=request),
        public_id=public_id,
        user_id=user.result().id,
        persist=False,
    )
    if result.is_not_ok():
        logger.error(f"Queue resolution failed: {result.info()}")
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())
    return result.result()
