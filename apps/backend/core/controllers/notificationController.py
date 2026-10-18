from fastapi import APIRouter, Depends, Query, Request

from backend.core.controllers.notificationHelpers import value_or_error
from backend.core.middlewares.authMiddleware import AuthMiddleware as AuthDependency
from backend.core.framework.notification import Notification
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from backend.core.responses.notificationResponses import (
    NotificationDestinationResponse,
    NotificationPageResponse,
    NotificationResponse,
)

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
async def mark_notification_read(
    request: Request, public_id: str
) -> NotificationResponse:
    session = DBSessionMiddleware.get_session(request)
    user = value_or_error(AuthDependency.get_current_user(request))
    row = value_or_error(
        await Notification.mark_read_async(session, user.id, public_id)
    )
    return NotificationResponse.from_row(row)


@router.get("/{public_id}/destination", response_model=NotificationDestinationResponse)
async def get_notification_destination(
    request: Request, public_id: str
) -> NotificationDestinationResponse:
    session = DBSessionMiddleware.get_session(request)
    user = value_or_error(AuthDependency.get_current_user(request))
    return value_or_error(
        await Notification.get_destination_async(session, user.id, public_id)
    )
