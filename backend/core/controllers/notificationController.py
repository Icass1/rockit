from typing import TypeVar
from fastapi import APIRouter, Depends, HTTPException, Request

from backend.utils.logger import getLogger
from backend.core.aResult import AResult
from backend.core.framework.notifications import Notifications
from backend.core.middlewares.authMiddleware import AuthMiddleware
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from backend.core.responses.notificationsResponse import NotificationsResponse
from backend.core.responses.okResponse import OkResponse
from backend.core.requests.notificationRequest import (
    LegacyNotificationsRequest,
    NotificationActivityRequest,
    NotificationsReadRequest,
)

T = TypeVar("T")
logger = getLogger(__name__)
router = APIRouter(
    prefix="/notifications",
    dependencies=[Depends(AuthMiddleware.auth_dependency)],
    tags=["Core", "Notifications"],
)


def _checked(result: AResult[T]) -> T:
    """Translate framework failures at the HTTP boundary."""
    if result.is_not_ok():
        logger.error(f"Notifications request failed: {result.info()}")
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())
    return result.result()


@router.get("")
async def get_notifications(request: Request) -> NotificationsResponse:
    """Get the authenticated user's shared inbox."""
    user = _checked(AuthMiddleware.get_current_user(request=request))
    return _checked(
        await Notifications.list_async(
            session=DBSessionMiddleware.get_session(request=request),
            user_id=user.id,
            lang_id=user.lang_id,
        )
    )


@router.post("/activity")
async def create_notification_activity(
    request: Request, payload: NotificationActivityRequest
) -> OkResponse:
    """Persist personal client activity in the current user's inbox."""
    user = _checked(AuthMiddleware.get_current_user(request=request))
    _checked(
        await Notifications.activity_async(
            session=DBSessionMiddleware.get_session(request=request),
            user_id=user.id,
            payload=payload,
        )
    )
    return OkResponse()


@router.post("/read")
async def mark_notifications_read(
    request: Request, payload: NotificationsReadRequest
) -> OkResponse:
    """Mark the selected notifications read, without deleting them."""
    user = _checked(AuthMiddleware.get_current_user(request=request))
    _checked(
        await Notifications.mark_read_async(
            session=DBSessionMiddleware.get_session(request=request),
            user_id=user.id,
            public_ids=payload.ids,
        )
    )
    return OkResponse()


@router.post("/legacy")
async def migrate_legacy_notifications(
    request: Request, payload: LegacyNotificationsRequest
) -> OkResponse:
    """Import retained browser history into the current user's inbox."""
    user = _checked(AuthMiddleware.get_current_user(request=request))
    _checked(
        await Notifications.migrate_legacy_async(
            session=DBSessionMiddleware.get_session(request=request),
            user_id=user.id,
            payload=payload,
        )
    )
    return OkResponse()
