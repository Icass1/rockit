from fastapi import Depends, APIRouter, HTTPException, Request
from logging import Logger
from typing import Dict, Any

from sqlalchemy.ext.asyncio.session import AsyncSession

from backend.core.aResult import AResult
from backend.core.middlewares.authMiddleware import AuthMiddleware
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from backend.utils.logger import getLogger

from backend.core.access.db.ormModels.user import UserRow
from backend.core.access.userQueueAccess import UserQueueAccess

from backend.core.enums.queueTypeEnum import QueueTypeEnum

from backend.core.responses.okResponse import OkResponse

logger: Logger = getLogger(__name__)
router = APIRouter(
    prefix="/queue", dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)]
)


@router.get("")
async def get_queue(request: Request) -> Dict[str, Any]:
    """Get the user's queue."""
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    user_id: int = a_result_user.result().id

    a_result_queue = await UserQueueAccess.get_user_queue(
        session=session,
        user_id=user_id,
        queue_type=QueueTypeEnum.SORTED,
    )
    if a_result_queue.is_not_ok():
        logger.error(f"Error getting user queue. {a_result_queue.info()}")
        raise HTTPException(
            status_code=a_result_queue.get_http_code(), detail=a_result_queue.message()
        )

    queue_items = a_result_queue.result()
    return {
        "queue": [
            {
                "queueIndex": item.queue_index,
                "mediaId": item.media_id,
            }
            for item in queue_items
        ]
    }


@router.delete("")
async def clear_queue(request: Request) -> OkResponse:
    """Clear the user's queue."""
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    user_id: int = a_result_user.result().id

    a_result = await UserQueueAccess.clear_user_queue(
        session=session,
        user_id=user_id,
        queue_type=QueueTypeEnum.SORTED,
    )
    if a_result.is_not_ok():
        logger.error(f"Error clearing user queue. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse()
