from typing import TypeVar

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from core.aResult import AResult
from core.framework.notification import Notification
from core.middlewares.authMiddleware import AuthMiddleware as AuthDependency
from core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from core.responses.notificationResponses import (
    NotificationDestinationResponse,
    NotificationPageResponse,
    NotificationResponse,
)
from logger import logger
from result import Result

T = TypeVar("T")


def value_or_error[T](result: Result[T] | AResult[T]) -> T:
    """Translate a terminal service result into an HTTP response."""
    if result.is_not_ok():
        if isinstance(result, Result):
            result.finish()
        else:
            logger.error(result.info())
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())
    return result.result()


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
    dependencies=[Depends(AuthDependency.auth_dependency)],
)


@router.get("", response_model=NotificationPageResponse)
async def list_notifications(
    request: Request,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    unread_only: bool = Query(default=False),
) -> NotificationPageResponse:
    session = DBSessionMiddleware.get_session(request)
    user = value_or_error(AuthDependency.get_current_user(request))
    rows, unread, total = value_or_error(
        await Notification.list_async(session, user.id, limit, offset, unread_only)
    )
    return NotificationPageResponse(
        items=[NotificationResponse.from_row(row) for row in rows],
        unreadCount=unread,
        totalCount=total,
    )


@router.patch("/{public_id}/read", response_model=NotificationResponse)
async def mark_notification_read(request: Request, public_id: str) -> NotificationResponse:
    session = DBSessionMiddleware.get_session(request)
    user = value_or_error(AuthDependency.get_current_user(request))
    row = value_or_error(await Notification.mark_read_async(session, user.id, public_id))
    return NotificationResponse.from_row(row)


@router.get("/{public_id}/destination", response_model=NotificationDestinationResponse)
async def get_notification_destination(
    request: Request, public_id: str
) -> NotificationDestinationResponse:
    session = DBSessionMiddleware.get_session(request)
    user = value_or_error(AuthDependency.get_current_user(request))
    return value_or_error(await Notification.get_destination_async(session, user.id, public_id))
