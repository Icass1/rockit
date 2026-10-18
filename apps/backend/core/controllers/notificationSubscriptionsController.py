from backend.core.responses.notificationResponses import (
    NotificationUserResponse,
    NotificationUsersResponse,
)
from fastapi import APIRouter, Depends, Request
from backend.core.controllers.notificationHelpers import value_or_error
from backend.core.framework.notification import Notification
from backend.core.middlewares.authMiddleware import AuthMiddleware
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from backend.core.responses.notificationResponses import (
    NotificationSubscriptionsResponse,
    NotificationEventsResponse,
)

router = APIRouter(
    prefix="/users",
    tags=["Notifications"],
    dependencies=[Depends(AuthMiddleware.admin_dependency)],
)


@router.get("/notification-events", response_model=NotificationEventsResponse)
async def events() -> NotificationEventsResponse:
    return NotificationEventsResponse(events=Notification.list_events())


@router.get(
    "/{public_id}/notification-subscriptions",
    response_model=NotificationSubscriptionsResponse,
)
async def subscriptions(
    request: Request, public_id: str
) -> NotificationSubscriptionsResponse:
    return value_or_error(
        await Notification.get_subscriptions_async(
            session=DBSessionMiddleware.get_session(request=request),
            user_public_id=public_id,
        )
    )


@router.patch(
    "/{public_id}/notification-subscriptions",
    response_model=NotificationSubscriptionsResponse,
)
async def update_subscriptions(
    request: Request, public_id: str, payload: NotificationSubscriptionsResponse
) -> NotificationSubscriptionsResponse:
    return value_or_error(
        await Notification.set_subscriptions_async(
            session=DBSessionMiddleware.get_session(request=request),
            user_public_id=public_id,
            event_keys=payload.eventKeys,
        )
    )


@router.get("/notification-users", response_model=NotificationUsersResponse)
async def notification_users(request: Request) -> NotificationUsersResponse:
    rows = value_or_error(
        await Notification.users_async(
            session=DBSessionMiddleware.get_session(request=request)
        )
    )
    return NotificationUsersResponse(
        users=[
            NotificationUserResponse(publicId=row.public_id, username=row.username)
            for row in rows
        ]
    )
