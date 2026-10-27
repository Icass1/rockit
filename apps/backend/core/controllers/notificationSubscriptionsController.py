from typing import TypeVar

from fastapi import APIRouter, Depends, HTTPException, Request

from core.framework.notification import Notification
from core.middlewares.authMiddleware import AuthMiddleware as AuthDependency
from core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from core.requests.notificationRequests import UpdateNotificationSubscriptionsRequest
from core.responses.notificationResponses import (
    NotificationEventResponse,
    NotificationSubscriptionsResponse,
    NotificationUserResponse,
)
from result import Result
from core.aResult import AResult
from logger import logger

T = TypeVar("T")
router = APIRouter(
    prefix="/users", tags=["Users"], dependencies=[Depends(AuthDependency.admin_dependency)]
)


def value_or_error[T](result: Result[T] | AResult[T]) -> T:
    """Translate a terminal service result into an HTTP response."""
    if result.is_not_ok():
        if isinstance(result, Result):
            result.finish()
        else:
            logger.error(result.info())
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())
    return result.result()


@router.get("/notification-events", response_model=list[NotificationEventResponse])
async def list_notification_events() -> list[NotificationEventResponse]:
    return Notification.list_events()


@router.get(
    "/{public_id}/notification-subscriptions", response_model=NotificationSubscriptionsResponse
)
async def get_notification_subscriptions(
    request: Request, public_id: str
) -> NotificationSubscriptionsResponse:
    session = DBSessionMiddleware.get_session(request)
    return value_or_error(await Notification.get_subscriptions_async(session, public_id))


@router.patch(
    "/{public_id}/notification-subscriptions", response_model=NotificationSubscriptionsResponse
)
async def set_notification_subscriptions(
    request: Request, public_id: str, payload: UpdateNotificationSubscriptionsRequest
) -> NotificationSubscriptionsResponse:
    session = DBSessionMiddleware.get_session(request)
    return value_or_error(
        await Notification.set_subscriptions_async(session, public_id, payload.eventKeys)
    )


@router.get("", response_model=list[NotificationUserResponse])
async def list_notification_users(request: Request) -> list[NotificationUserResponse]:
    """List accounts for admin-managed event subscriptions."""
    session = DBSessionMiddleware.get_session(request)
    return value_or_error(await Notification.list_users_async(session))
