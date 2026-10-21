import json
from backend.core.framework.media.media import Media
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.middlewares.authMiddleware import AuthMiddleware
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from backend.core.access.db.ormModels.user import UserRow
from backend.core.access.db.ormModels.friend.friend import FriendRow

from backend.core.framework.friend.friend import Friend
from backend.core.framework.friend.sharing import Sharing
from backend.core.framework.friend.listenTogether import ListenTogether
from backend.core.framework.friend.levels import Levels
from backend.core.framework.friend.activity import FriendActivity
from backend.core.framework.friend.vibe import Vibe
from backend.core.framework.friend.streakBattle import StreakBattle
from backend.core.framework.stats import Stats as StatsFramework

from backend.core.requests.friend.friendRequests import (
    ShareMediaRequest,
    ListenTogetherInviteRequest,
    ListenTogetherJoinRequest,
    ListenTogetherLeaveRequest,
    ListenTogetherSyncRequest,
)

from backend.core.responses.friend.friendResponse import (
    FriendResponse,
    FriendListResponse,
)
from backend.core.responses.friend.friendRequestResponse import (
    FriendRequestResponse,
    FriendRequestListResponse,
)
from backend.core.responses.friend.friendActivityResponse import (
    FriendActivityResponse,
)
from backend.core.responses.friend.sharedMediaResponse import (
    SharedMediaInboxResponse,
    SharedMediaSentResponse,
)
from backend.core.responses.friend.listenTogetherResponse import (
    ListenTogetherSessionResponse,
    ListenTogetherListResponse,
)
from backend.core.responses.friend.friendStatsResponse import (
    FriendStatsResponse,
    CompareStatsResponse,
    FriendStreakResponse,
    VibeScoreResponse,
)
from backend.core.responses.friend.friendSearchResponse import (
    UserSearchResult,
    FriendSearchResponse,
)
from backend.core.responses.friend.userLevelResponse import (
    UserLevelResponse,
    LeaderboardResponse,
)
from backend.core.responses.okResponse import OkResponse

logger = getLogger(__name__)

router = APIRouter(
    prefix="/friends",
    dependencies=[Depends(AuthMiddleware.auth_dependency)],
    tags=["Core", "Friends"],
)


def _get_user(request: Request) -> UserRow:
    a_user = AuthMiddleware.get_current_user(request=request)
    if a_user.is_not_ok():
        logger.error(f"Authentication error: {a_user.info()}")
        raise HTTPException(status_code=500, detail="Internal authentication error")
    return a_user.result()


# ─── Friends CRUD ────────────────────────────────────────────────────────────


async def _require_friend(session: AsyncSession, user_id: int, target_id: int) -> None:
    if user_id == target_id:
        return
    allowed = await Friend.require_friend_async(session, user_id, target_id)
    if allowed.is_not_ok():
        logger.error(f"Friend profile access denied. {allowed.info()}")
        raise HTTPException(
            status_code=allowed.get_http_code(), detail=allowed.message()
        )


@router.get("", response_model=FriendListResponse)
async def get_friends(request: Request):
    """Get all friends for the current user."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result = await Friend.get_friends_async(session=session, user_id=user.id)
    if a_result.is_not_ok():
        logger.error(f"Error getting friends: {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    friend_rows: List[FriendRow] = a_result.result()
    profiles = await Levels.get_profiles_async(
        session, [row.friend_user_id for row in friend_rows]
    )
    if profiles.is_not_ok():
        logger.error(f"Error getting friend levels. {profiles.info()}")
        raise HTTPException(
            status_code=profiles.get_http_code(), detail=profiles.message()
        )
    levels_by_user = {profile.userId: profile for profile in profiles.result()}
    from backend.core.framework.websocket.webSocketManager import ws_manager

    friends: list[FriendResponse] = []
    for fr in friend_rows:
        friend_user = fr.friend
        friends.append(
            FriendResponse(
                publicId=friend_user.public_id,
                username=friend_user.username,
                imageUrl=friend_user.image.url if friend_user.image else None,
                status="accepted",
                level=levels_by_user[friend_user.public_id].level,
                levelTitle=levels_by_user[friend_user.public_id].title,
                isOnline=bool(ws_manager.active_connections.get(friend_user.id)),
                dateAdded=fr.date_added,
            )
        )

    return FriendListResponse(friends=friends)


@router.get("/blocked", response_model=FriendListResponse)
async def get_blocked_users(request: Request) -> FriendListResponse:
    user = _get_user(request)
    session = DBSessionMiddleware.get_session(request)
    blocked = await Friend.get_blocked_async(session, user.id)
    if blocked.is_not_ok():
        logger.error(f"Error getting blocked users. {blocked.info()}")
        raise HTTPException(
            status_code=blocked.get_http_code(), detail=blocked.message()
        )
    return FriendListResponse(
        friends=[
            FriendResponse(
                publicId=row.friend.public_id,
                username=row.friend.username,
                imageUrl=row.friend.image.url if row.friend.image else None,
                status="blocked",
                dateAdded=row.date_added,
            )
            for row in blocked.result()
        ]
    )


@router.get("/requests", response_model=FriendRequestListResponse)
async def get_friend_requests(request: Request):
    """Get pending friend requests (incoming and sent)."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_incoming = await Friend.get_pending_requests_async(
        session=session, user_id=user.id
    )
    a_sent = await Friend.get_sent_requests_async(session=session, user_id=user.id)

    incoming: list[FriendRequestResponse] = []
    if a_incoming.is_ok():
        for req in a_incoming.result():
            from_user = req.from_user
            incoming.append(
                FriendRequestResponse(
                    publicId=req.public_id,
                    fromUserPublicId=from_user.public_id,
                    fromUsername=from_user.username,
                    fromUserImageUrl=from_user.image.url if from_user.image else None,
                    message=req.message,
                    status="pending",
                    dateAdded=req.date_added,
                )
            )

    sent: list[FriendRequestResponse] = []
    if a_sent.is_ok():
        for req in a_sent.result():
            to_user = req.to_user
            sent.append(
                FriendRequestResponse(
                    publicId=req.public_id,
                    fromUserPublicId=to_user.public_id,
                    fromUsername=to_user.username,
                    fromUserImageUrl=to_user.image.url if to_user.image else None,
                    message=req.message,
                    status="pending",
                    dateAdded=req.date_added,
                )
            )

    return FriendRequestListResponse(incoming=incoming, sent=sent)


@router.get("/search", response_model=FriendSearchResponse)
async def search_users(request: Request, q: str = Query(min_length=2, max_length=100)):
    """Search users by username."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result = await Friend.search_users_async(
        session=session, query=q, current_user_id=user.id
    )
    if a_result.is_not_ok():
        logger.error(f"Error searching users: {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    friend_ids_result = await Friend.get_friend_ids_async(
        session=session, user_id=user.id
    )
    friend_ids: set[int] = (
        set(friend_ids_result.result()) if friend_ids_result.is_ok() else set()
    )

    pending = await Friend.get_sent_requests_async(session, user.id)
    if pending.is_not_ok():
        logger.error(f"Error checking sent requests. {pending.info()}")
        raise HTTPException(
            status_code=pending.get_http_code(), detail=pending.message()
        )
    pending_ids = {row.to_user_id for row in pending.result()}
    results: list[UserSearchResult] = []
    for user_row in a_result.result():
        results.append(
            UserSearchResult(
                publicId=user_row.public_id,
                username=user_row.username,
                imageUrl=user_row.image.url if user_row.image else None,
                isFriend=user_row.id in friend_ids,
                requestSent=user_row.id in pending_ids,
            )
        )

    return FriendSearchResponse(results=results)


@router.post("/request/{user_public_id}", response_model=OkResponse)
async def send_friend_request(request: Request, user_public_id: str):
    """Send a friend request to a user."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_target = await Friend.get_user_by_public_id_async(
        session=session, public_id=user_public_id
    )
    if a_target.is_not_ok():
        logger.error(f"Target user not found: {a_target.info()}")
        raise HTTPException(
            status_code=a_target.get_http_code(), detail=a_target.message()
        )

    a_result = await Friend.send_friend_request_async(
        session=session,
        from_user_id=user.id,
        to_user_id=a_target.result().id,
        message=None,
    )
    if a_result.is_not_ok():
        logger.error(f"Error sending friend request: {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse(status="OK")


@router.post("/request/{request_public_id}/accept", response_model=OkResponse)
async def accept_friend_request(request: Request, request_public_id: str):
    """Accept a friend request."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result = await Friend.accept_friend_request_async(
        session=session, user_id=user.id, request_public_id=request_public_id
    )
    if a_result.is_not_ok():
        logger.error(f"Error accepting friend request: {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse(status="OK")


@router.post("/request/{request_public_id}/reject", response_model=OkResponse)
async def reject_friend_request(request: Request, request_public_id: str):
    """Reject a friend request."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result = await Friend.reject_friend_request_async(
        session=session, user_id=user.id, request_public_id=request_public_id
    )
    if a_result.is_not_ok():
        logger.error(f"Error rejecting friend request: {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse(status="OK")


@router.delete("/{user_public_id}", response_model=OkResponse)
async def remove_friend(request: Request, user_public_id: str):
    """Remove a friend."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_target = await Friend.get_user_by_public_id_async(
        session=session, public_id=user_public_id
    )
    if a_target.is_not_ok():
        logger.error(f"Target user not found: {a_target.info()}")
        raise HTTPException(
            status_code=a_target.get_http_code(), detail=a_target.message()
        )

    a_result = await Friend.remove_friend_async(
        session=session, user_id=user.id, friend_user_id=a_target.result().id
    )
    if a_result.is_not_ok():
        logger.error(f"Error removing friend: {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse(status="OK")


@router.post("/block/{user_public_id}", response_model=OkResponse)
async def block_user(request: Request, user_public_id: str):
    """Block a user."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_target = await Friend.get_user_by_public_id_async(
        session=session, public_id=user_public_id
    )
    if a_target.is_not_ok():
        logger.error(f"Target user not found: {a_target.info()}")
        raise HTTPException(
            status_code=a_target.get_http_code(), detail=a_target.message()
        )

    a_result = await Friend.block_user_async(
        session=session, user_id=user.id, block_user_id=a_target.result().id
    )
    if a_result.is_not_ok():
        logger.error(f"Error blocking user: {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse(status="OK")


@router.delete("/block/{user_public_id}", response_model=OkResponse)
async def unblock_user(request: Request, user_public_id: str):
    """Unblock a user."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_target = await Friend.get_user_by_public_id_async(
        session=session, public_id=user_public_id
    )
    if a_target.is_not_ok():
        logger.error(f"Target user not found: {a_target.info()}")
        raise HTTPException(
            status_code=a_target.get_http_code(), detail=a_target.message()
        )

    a_result = await Friend.unblock_user_async(
        session=session, user_id=user.id, blocked_user_id=a_target.result().id
    )
    if a_result.is_not_ok():
        logger.error(f"Error unblocking user: {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse(status="OK")


# ─── Activity ─────────────────────────────────────────────────────────────────


@router.get("/activity", response_model=FriendActivityResponse)
async def get_friends_activity(request: Request):
    """Get activity feed of friends."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result = await FriendActivity.get_friends_activity_async(
        session=session, user_id=user.id
    )
    if a_result.is_not_ok():
        logger.error(f"Error getting friends activity: {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    activities = a_result.result()
    return FriendActivityResponse(activities=activities)


# ─── Share ────────────────────────────────────────────────────────────────────


@router.post("/share", response_model=OkResponse)
async def share_media(request: Request, body: ShareMediaRequest):
    """Share a media item with a friend."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_target = await Friend.get_user_by_public_id_async(
        session=session, public_id=body.recipientPublicId
    )
    if a_target.is_not_ok():
        logger.error(f"Target user not found: {a_target.info()}")
        raise HTTPException(
            status_code=a_target.get_http_code(), detail=a_target.message()
        )

    a_result = await Sharing.share_media_async(
        session=session,
        sender_user_id=user.id,
        recipient_user_id=a_target.result().id,
        media_public_id=body.mediaPublicId,
        message=body.message,
    )
    if a_result.is_not_ok():
        logger.error(f"Error sharing media: {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse(status="OK")


@router.get("/share/inbox", response_model=SharedMediaInboxResponse)
async def get_share_inbox(request: Request):
    """Get media shared with me."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result = await Sharing.get_inbox_async(session=session, user_id=user.id)
    if a_result.is_not_ok():
        logger.error(f"Error getting share inbox: {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    items = await Sharing.present_async(session, user.id, a_result.result())
    if items.is_not_ok():
        logger.error(f"Error presenting shares. {items.info()}")
        raise HTTPException(status_code=items.get_http_code(), detail=items.message())
    return SharedMediaInboxResponse(items=items.result())


@router.get("/share/sent", response_model=SharedMediaSentResponse)
async def get_share_sent(request: Request):
    """Get media I've shared."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result = await Sharing.get_sent_async(session=session, user_id=user.id)
    if a_result.is_not_ok():
        logger.error(f"Error getting sent shares: {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    items = await Sharing.present_async(session, user.id, a_result.result())
    if items.is_not_ok():
        logger.error(f"Error presenting shares. {items.info()}")
        raise HTTPException(status_code=items.get_http_code(), detail=items.message())
    return SharedMediaSentResponse(items=items.result())


@router.post("/share/{share_public_id}/seen", response_model=OkResponse)
async def mark_share_seen(request: Request, share_public_id: str):
    """Mark a shared media as seen."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result = await Sharing.mark_as_seen_async(
        session=session, user_id=user.id, share_public_id=share_public_id
    )
    if a_result.is_not_ok():
        logger.error(f"Error marking share as seen: {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse(status="OK")


@router.delete("/share/{share_public_id}", response_model=OkResponse)
async def delete_share(request: Request, share_public_id: str) -> OkResponse:
    user = _get_user(request)
    session = DBSessionMiddleware.get_session(request)
    result = await Sharing.delete_share_async(session, user.id, share_public_id)
    if result.is_not_ok():
        logger.error(f"Error deleting share. {result.info()}")
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())
    return OkResponse(status="OK")


# ─── Listen Together ──────────────────────────────────────────────────────────


@router.post("/listen-together/invite", response_model=OkResponse)
async def invite_to_session(request: Request, body: ListenTogetherInviteRequest):
    """Invite a friend to listen together."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_target = await Friend.get_user_by_public_id_async(
        session=session, public_id=body.userPublicId
    )
    if a_target.is_not_ok():
        logger.error(f"Target user not found: {a_target.info()}")
        raise HTTPException(
            status_code=a_target.get_http_code(), detail=a_target.message()
        )

    a_result = await ListenTogether.invite_async(
        session=session, host_user_id=user.id, guest_user_id=a_target.result().id
    )
    if a_result.is_not_ok():
        logger.error(f"Error inviting to session: {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse(status="OK")


@router.post("/listen-together/join", response_model=OkResponse)
async def join_session(request: Request, body: ListenTogetherJoinRequest):
    """Join a listen together session."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result = await ListenTogether.join_async(
        session=session, user_id=user.id, session_public_id=body.sessionPublicId
    )
    if a_result.is_not_ok():
        logger.error(f"Error joining session: {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse(status="OK")


@router.post("/listen-together/leave", response_model=OkResponse)
async def leave_session(request: Request, body: ListenTogetherLeaveRequest):
    """Leave a listen together session."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result = await ListenTogether.leave_async(
        session=session, user_id=user.id, session_public_id=body.sessionPublicId
    )
    if a_result.is_not_ok():
        logger.error(f"Error leaving session: {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse(status="OK")


@router.post("/listen-together/sync", response_model=OkResponse)
async def sync_session(request: Request, body: ListenTogetherSyncRequest):
    """Sync playback in a listen together session (host only)."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result = await ListenTogether.sync_async(
        session=session,
        user_id=user.id,
        session_public_id=body.sessionPublicId,
        media_public_id=body.mediaPublicId,
        current_time_ms=body.currentTimeMs,
        is_playing=body.isPlaying,
        queue_json=json.dumps(body.queue) if body.queue is not None else None,
    )
    if a_result.is_not_ok():
        logger.error(f"Error syncing session: {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse(status="OK")


@router.get("/listen-together/sessions", response_model=ListenTogetherListResponse)
async def get_active_sessions(request: Request):
    """Get active listen together sessions for current user."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result = await ListenTogether.get_active_sessions_async(
        session=session, user_id=user.id
    )
    if a_result.is_not_ok():
        logger.error(f"Error getting active sessions: {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    sessions: list[ListenTogetherSessionResponse] = []
    for s in a_result.result():
        host = s.host
        guest = s.guest
        current_media = s.current_media
        resolved = None
        if current_media:
            a_resolved = await Media.get_media_async(
                session, current_media.public_id, user.id
            )
            if a_resolved.is_ok():
                resolved = a_resolved.result()
            else:
                logger.error(f"Error resolving session media. {a_resolved.info()}")
        sessions.append(
            ListenTogetherSessionResponse(
                publicId=s.public_id,
                hostPublicId=host.public_id,
                hostUsername=host.username,
                hostImageUrl=host.image.url if host.image else None,
                guestPublicId=guest.public_id,
                guestUsername=guest.username,
                guestImageUrl=guest.image.url if guest.image else None,
                currentMediaPublicId=current_media.public_id if current_media else None,
                currentMediaName=resolved.media.name if resolved else None,
                currentMediaImageUrl=resolved.media.imageUrl if resolved else None,
                currentMedia=resolved,
                updatedAt=s.date_updated,
                currentTimeMs=s.current_time_ms,
                isPlaying=s.is_playing,
                status=(
                    "active"
                    if s.status.name == "ACTIVE"
                    else "invited" if s.status.name == "INVITED" else "ended"
                ),
            )
        )

    return ListenTogetherListResponse(sessions=sessions)


# ─── Stats & Compare ─────────────────────────────────────────────────────────


@router.get("/{user_public_id}/stats", response_model=FriendStatsResponse)
async def get_friend_stats(request: Request, user_public_id: str):
    """Get a friend's listening stats."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_target = await Friend.get_user_by_public_id_async(
        session=session, public_id=user_public_id
    )
    if a_target.is_not_ok():
        logger.error(f"Target user not found: {a_target.info()}")
        raise HTTPException(
            status_code=a_target.get_http_code(), detail=a_target.message()
        )

    target = a_target.result()
    await _require_friend(session, user.id, target.id)

    from backend.core.requests.userStatsRequest import UserStatsRequest

    stats_req = UserStatsRequest(range="7d")

    a_stats = await StatsFramework.get_user_stats_async(
        session=session,
        user_id=target.id,
        range_value=stats_req.range,
    )
    if a_stats.is_not_ok():
        logger.error(f"Error getting user stats: {a_stats.info()}")

    a_level = await Levels.get_user_level_async(session=session, user_id=target.id)
    if a_level.is_not_ok():
        logger.error(f"Error getting user level: {a_level.info()}")

    minutes = 0
    songs = 0
    streak = 0
    level = 1
    xp = 0

    if a_stats.is_ok():
        minutes = a_stats.result().summary.minutesListened
        songs = a_stats.result().summary.songsListened
        streak = a_stats.result().summary.currentStreak

    if a_level.is_ok():
        level = a_level.result().level
        xp = a_level.result().xp

    return FriendStatsResponse(
        username=target.username,
        imageUrl=target.image.url if target.image else None,
        minutesListened=minutes,
        songsListened=songs,
        currentStreak=streak,
        level=level,
        xp=xp,
    )


@router.get("/{user_public_id}/streak", response_model=FriendStreakResponse)
async def get_friend_streak(request: Request, user_public_id: str):
    """Get a friend's streak."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_target = await Friend.get_user_by_public_id_async(
        session=session, public_id=user_public_id
    )
    if a_target.is_not_ok():
        logger.error(f"Target user not found: {a_target.info()}")
        raise HTTPException(
            status_code=a_target.get_http_code(), detail=a_target.message()
        )

    await _require_friend(session, user.id, a_target.result().id)
    a_streak = await StreakBattle.get_streak_for_user_async(
        session=session, user_id=a_target.result().id
    )
    if a_streak.is_not_ok():
        logger.error(f"Error getting streak: {a_streak.info()}")

    streak = a_streak.result() if a_streak.is_ok() else 0
    return FriendStreakResponse(currentStreak=streak)


@router.get("/compare/{user_public_id}", response_model=CompareStatsResponse)
async def compare_stats(request: Request, user_public_id: str):
    """Compare current user's stats with a friend."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_target = await Friend.get_user_by_public_id_async(
        session=session, public_id=user_public_id
    )
    if a_target.is_not_ok():
        logger.error(f"Target user not found: {a_target.info()}")
        raise HTTPException(
            status_code=a_target.get_http_code(), detail=a_target.message()
        )

    target = a_target.result()
    await _require_friend(session, user.id, target.id)

    from backend.core.requests.userStatsRequest import UserStatsRequest

    stats_req = UserStatsRequest(range="7d")

    a_my_stats = await StatsFramework.get_user_stats_async(
        session=session,
        user_id=user.id,
        range_value=stats_req.range,
    )
    a_friend_stats = await StatsFramework.get_user_stats_async(
        session=session,
        user_id=target.id,
        range_value=stats_req.range,
    )

    a_my_level = await Levels.get_user_level_async(session=session, user_id=user.id)
    a_friend_level = await Levels.get_user_level_async(
        session=session, user_id=target.id
    )
    a_vibe = await Vibe.get_vibe_score_async(
        session=session, user_id=user.id, friend_user_id=target.id
    )

    if a_my_stats.is_not_ok():
        logger.error(f"Error getting my stats: {a_my_stats.info()}")
    if a_friend_stats.is_not_ok():
        logger.error(f"Error getting friend stats: {a_friend_stats.info()}")
    if a_my_level.is_not_ok():
        logger.error(f"Error getting my level: {a_my_level.info()}")
    if a_friend_level.is_not_ok():
        logger.error(f"Error getting friend level: {a_friend_level.info()}")
    if a_vibe.is_not_ok():
        logger.error(f"Error getting vibe score: {a_vibe.info()}")

    my_stats = a_my_stats.result() if a_my_stats.is_ok() else None
    friend_stats = a_friend_stats.result() if a_friend_stats.is_ok() else None

    my_level_row = a_my_level.result() if a_my_level.is_ok() else None
    friend_level_row = a_friend_level.result() if a_friend_level.is_ok() else None

    vibe = a_vibe.result() if a_vibe.is_ok() else None

    return CompareStatsResponse(
        myStats=FriendStatsResponse(
            username=user.username,
            imageUrl=user.image.url if user.image else None,
            minutesListened=my_stats.summary.minutesListened if my_stats else 0,
            songsListened=my_stats.summary.songsListened if my_stats else 0,
            currentStreak=my_stats.summary.currentStreak if my_stats else 0,
            level=my_level_row.level if my_level_row else 1,
            xp=my_level_row.xp if my_level_row else 0,
        ),
        friendStats=FriendStatsResponse(
            username=target.username,
            imageUrl=target.image.url if target.image else None,
            minutesListened=friend_stats.summary.minutesListened if friend_stats else 0,
            songsListened=friend_stats.summary.songsListened if friend_stats else 0,
            currentStreak=friend_stats.summary.currentStreak if friend_stats else 0,
            level=friend_level_row.level if friend_level_row else 1,
            xp=friend_level_row.xp if friend_level_row else 0,
        ),
        vibeScore=vibe.score if vibe else 0,
        vibeDescriptor=vibe.descriptor if vibe else "",
    )


# ─── Levels & Leaderboard ─────────────────────────────────────────────────────


@router.get("/levels", response_model=UserLevelResponse)
async def get_my_level(request: Request):
    """Get current user's level info."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_level = await Levels.get_user_level_async(session=session, user_id=user.id)
    if a_level.is_not_ok():
        logger.error(f"Error getting my level: {a_level.info()}")
        raise HTTPException(
            status_code=a_level.get_http_code(), detail=a_level.message()
        )

    level_row = a_level.result()
    a_configs = await Levels.get_level_configs_async(session=session)
    configs = a_configs.result() if a_configs.is_ok() else []

    for c in configs:
        if c.level > level_row.level:
            break

    title = ""
    xp_to_next = 0
    for c in configs:
        if c.level == level_row.level:
            title = c.title
        if c.level == level_row.level + 1:
            xp_to_next = c.xp_required - level_row.xp

    a_streak = await StreakBattle.get_streak_for_user_async(
        session=session, user_id=user.id
    )

    return UserLevelResponse(
        userId=user.public_id,
        username=user.username,
        imageUrl=user.image.url if user.image else None,
        level=level_row.level,
        xp=level_row.xp,
        xpToNext=max(0, xp_to_next),
        title=title,
        streak=a_streak.result() if a_streak.is_ok() else 0,
    )


@router.get("/{user_public_id}/level", response_model=UserLevelResponse)
async def get_user_level(request: Request, user_public_id: str):
    """Get a user's level info."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_target = await Friend.get_user_by_public_id_async(
        session=session, public_id=user_public_id
    )
    if a_target.is_not_ok():
        logger.error(f"Target user not found: {a_target.info()}")
        raise HTTPException(
            status_code=a_target.get_http_code(), detail=a_target.message()
        )

    target = a_target.result()
    await _require_friend(session, user.id, target.id)
    a_level = await Levels.get_user_level_async(session=session, user_id=target.id)
    if a_level.is_not_ok():
        logger.error(f"Error getting user level: {a_level.info()}")
        raise HTTPException(
            status_code=a_level.get_http_code(), detail=a_level.message()
        )

    level_row = a_level.result()
    a_configs = await Levels.get_level_configs_async(session=session)
    configs = a_configs.result() if a_configs.is_ok() else []

    title = ""
    xp_to_next = 0
    for c in configs:
        if c.level == level_row.level:
            title = c.title
        if c.level == level_row.level + 1:
            xp_to_next = c.xp_required - level_row.xp

    a_streak = await StreakBattle.get_streak_for_user_async(
        session=session, user_id=target.id
    )

    return UserLevelResponse(
        userId=target.public_id,
        username=target.username,
        imageUrl=target.image.url if target.image else None,
        level=level_row.level,
        xp=level_row.xp,
        xpToNext=max(0, xp_to_next),
        title=title,
        streak=a_streak.result() if a_streak.is_ok() else 0,
    )


@router.get("/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(request: Request):
    """Get leaderboard of friends by XP."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_friend_ids = await Friend.get_friend_ids_async(session=session, user_id=user.id)
    friend_ids = a_friend_ids.result() if a_friend_ids.is_ok() else []

    all_user_ids = [user.id] + friend_ids

    profiles = await Levels.get_profiles_async(session, all_user_ids)
    if profiles.is_not_ok():
        logger.error(f"Error getting leaderboard. {profiles.info()}")
        raise HTTPException(
            status_code=profiles.get_http_code(), detail=profiles.message()
        )
    entries = sorted(
        profiles.result(), key=lambda entry: (-entry.xp, entry.username.casefold())
    )
    return LeaderboardResponse(
        entries=entries,
        currentUser=next(
            (entry for entry in entries if entry.userId == user.public_id), None
        ),
    )


# ─── Vibe Score ───────────────────────────────────────────────────────────────


@router.get("/{user_public_id}/vibe", response_model=VibeScoreResponse)
async def get_vibe_score(request: Request, user_public_id: str):
    """Get vibe score with a friend."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_target = await Friend.get_user_by_public_id_async(
        session=session, public_id=user_public_id
    )
    if a_target.is_not_ok():
        logger.error(f"Target user not found: {a_target.info()}")
        raise HTTPException(
            status_code=a_target.get_http_code(), detail=a_target.message()
        )

    await _require_friend(session, user.id, a_target.result().id)
    a_result = await Vibe.get_vibe_score_async(
        session=session, user_id=user.id, friend_user_id=a_target.result().id
    )
    if a_result.is_not_ok():
        logger.error(f"Error getting vibe score: {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    vibe = a_result.result()
    return VibeScoreResponse(
        score=vibe.score,
        descriptor=vibe.descriptor,
        sharedArtistsCount=vibe.sharedArtistsCount,
    )
