"""Deliver social updates only after the request transaction commits."""

from typing import TYPE_CHECKING

from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.image import ImageRow
from core.access.db.ormModels.user import UserRow
from core.framework.media.image import Image
from core.responses.friend.friendRequestResponse import FriendRequestResponse
from core.responses.friend.friendResponse import FriendResponse
from core.responses.friend.socialSnapshotMessage import SocialSnapshotMessage
from core.responses.notificationResponses import NotificationStateMessage
from core.utils.afterCommit import after_commit
from logger import getLogger
from result import Result

logger = getLogger(__name__)

if TYPE_CHECKING:
    from core.framework.websocket.webSocketManager import WebSocketManager


def notify_after_commit(
    session: AsyncSession, user_ids: list[int], kind: str = "social_changed"
) -> None:
    if "social_events" not in session.info:
        session.info["social_events"] = set()
        after_commit(session, lambda: deliver_notifications(session))
    events: set[tuple[int, str]] = session.info["social_events"]
    events.update((user_id, kind) for user_id in user_ids)


def notify_notifications_after_commit(session: AsyncSession, user_id: int) -> None:
    """Refresh only the recipient's notification inbox after commit."""
    if "notification_events" not in session.info:
        session.info["notification_events"] = set()
        after_commit(session, lambda: deliver_notification_events(session))
    session.info["notification_events"].add(user_id)


async def deliver_notification_events(session: AsyncSession) -> None:
    from core import db_context
    from core.access.notificationAccess import NotificationAccess
    from core.framework.websocket.webSocketManager import ws_manager

    user_ids: set[int] = session.info.pop("notification_events", set())
    for user_id in user_ids:
        try:
            async with db_context.session_scope_async() as read_session:
                result = await NotificationAccess.list_async(
                    session=read_session, user_id=user_id, limit=20, offset=0
                )
                if result.is_not_ok():
                    logger.error("Unable to load notification counts: %s", result.info())
                    continue
                _, unread_count, total_count = result.result()
            await ws_manager.send_to_user_async(
                user_id=user_id,
                message=NotificationStateMessage(unreadCount=unread_count, totalCount=total_count),
            )
        except Exception:
            logger.exception("Unable to deliver notification update for user %s", user_id)


async def deliver_notifications(session: AsyncSession) -> None:
    from core.framework.websocket.webSocketManager import ws_manager

    events: set[tuple[int, str]] = session.info.pop("social_events", set())
    for user_id, kind in events:
        try:
            if kind == "social_refresh":
                kind = "social_changed"
            if kind == "social_changed":
                await ws_manager.send_social_snapshot_async(user_id=user_id)
                continue
        except Exception:
            logger.exception("Unable to deliver social update for user %s", user_id)


async def build_social_snapshot_async(
    session: AsyncSession, user_id: int, ws_manager: "WebSocketManager"
) -> SocialSnapshotMessage | None:
    """Build the current social lists after the originating transaction commits."""
    from core.access.db.ormModels.friend.friend import FriendRow
    from core.access.db.ormModels.friend.friendRequest import FriendRequestRow
    from core.framework.friend.activity import FriendActivity
    from core.framework.friend.friend import Friend
    from core.framework.friend.levels import Levels

    friends_result = await Friend.get_friends_async(session=session, user_id=user_id)
    incoming_result = await Friend.get_pending_requests_async(session=session, user_id=user_id)
    sent_result = await Friend.get_sent_requests_async(session=session, user_id=user_id)
    activity_result = await FriendActivity.get_friends_activity_async(
        session=session, user_id=user_id
    )
    for result in (friends_result, incoming_result, sent_result, activity_result):
        if result.is_not_ok():
            logger.error("Unable to build social snapshot: %s", result.info())
            return None

    friend_rows: list[FriendRow] = friends_result.result()
    profiles = await Levels.get_profiles_async(session, [row.friend_user_id for row in friend_rows])
    if profiles.is_not_ok():
        logger.error("Unable to load friend profiles: %s", profiles.info())
        return None
    levels_by_user = {profile.userId: profile for profile in profiles.result()}
    friends: list[FriendResponse] = []
    for row in friend_rows:
        friend_user = row.friend
        friends.append(
            FriendResponse(
                publicId=friend_user.public_id,
                username=friend_user.username,
                imageUrl=await _get_image_url_async(friend_user.image),
                status="accepted",
                level=levels_by_user[friend_user.public_id].level,
                levelTitle=levels_by_user[friend_user.public_id].title,
                isOnline=bool(ws_manager.active_connections.get(friend_user.id)),
                dateAdded=row.date_added,
            )
        )

    # Keep request presentation consistent with GET /friends/requests.
    async def request_response(row: FriendRequestRow, from_user: UserRow) -> FriendRequestResponse:
        return FriendRequestResponse(
            publicId=row.public_id,
            fromUserPublicId=from_user.public_id,
            fromUsername=from_user.username,
            fromUserImageUrl=await _get_image_url_async(from_user.image),
            message=row.message,
            status="pending",
            dateAdded=row.date_added,
        )

    incoming = [await request_response(row, row.from_user) for row in incoming_result.result()]
    sent = [await request_response(row, row.to_user) for row in sent_result.result()]
    return SocialSnapshotMessage(
        friends=friends,
        incoming=incoming,
        sent=sent,
        activities=activity_result.result(),
    )


async def _get_image_url_async(image: ImageRow | None) -> str | None:
    if image is None:
        return None
    result: Result[str] = await Image.get_internal_image_url_async(image=image)
    if result.is_not_ok():
        logger.warning("Unable to resolve social image URL: %s", result.info())
        return None
    return result.result()
