from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.middlewares.authMiddleware import AuthMiddleware
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from backend.core.access.db.ormModels.user import UserRow
from backend.core.access.db.ormModels.friend.friend import FriendRow
from backend.core.access.db.ormModels.friend.friendRequest import FriendRequestRow
from backend.core.access.db.ormModels.friend.sharedMedia import SharedMediaRow
from backend.core.access.db.ormModels.friend.listenTogether import (
    ListenTogetherSessionRow,
)
from backend.core.access.db.ormModels.friend.userLevel import UserLevelRow, LevelConfigRow
from backend.core.enums.friend.friendStatusEnum import FriendStatusEnum
from backend.core.enums.friend.listenTogetherStatusEnum import (
    ListenTogetherStatusEnum,
)

from backend.core.framework.friend.friend import Friend
from backend.core.framework.friend.sharing import Sharing
from backend.core.framework.friend.listenTogether import ListenTogether
from backend.core.framework.friend.levels import Levels
from backend.core.framework.friend.activity import FriendActivity
from backend.core.framework.friend.vibe import Vibe
from backend.core.framework.friend.streakBattle import StreakBattle
from backend.core.framework.stats import Stats as StatsFramework

from backend.core.requests.friend.friendRequests import (
    SendFriendRequest,
    ShareMediaRequest,
    ListenTogetherInviteRequest,
    ListenTogetherJoinRequest,
    ListenTogetherLeaveRequest,
    ListenTogetherSyncRequest,
    StreakBattleChallengeRequest,
)

from backend.core.responses.friend.friendResponse import FriendResponse, FriendListResponse
from backend.core.responses.friend.friendRequestResponse import (
    FriendRequestResponse,
    FriendRequestListResponse,
)
from backend.core.responses.friend.friendActivityResponse import (
    FriendActivityItem,
    FriendActivityResponse,
)
from backend.core.responses.friend.sharedMediaResponse import (
    SharedMediaItem,
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
)
from backend.core.responses.friend.friendSearchResponse import (
    UserSearchResult,
    FriendSearchResponse,
)
from backend.core.responses.friend.userLevelResponse import (
    UserLevelResponse,
    LeaderboardResponse,
    LevelConfig,
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
        raise HTTPException(status_code=401, detail="Not authenticated")
    return a_user.result()


# ─── Friends CRUD ────────────────────────────────────────────────────────────


@router.get("", response_model=FriendListResponse)
async def get_friends(request: Request):
    """Get all friends for the current user."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result = await Friend.get_friends_async(session=session, user_id=user.id)
    if a_result.is_not_ok():
        raise HTTPException(status_code=400, detail=a_result.message())

    friend_rows: List[FriendRow] = a_result.result()
    friends = []
    for fr in friend_rows:
        friend_user = fr.friend
        friends.append(
            FriendResponse(
                publicId=friend_user.public_id,
                username=friend_user.username,
                imageUrl=friend_user.image.url if friend_user.image else None,
                status="accepted",
                level=1,
                dateAdded=fr.date_added,
            )
        )

    return FriendListResponse(friends=friends)


@router.get("/requests", response_model=FriendRequestListResponse)
async def get_friend_requests(request: Request):
    """Get pending friend requests (incoming and sent)."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_incoming = await Friend.get_pending_requests_async(
        session=session, user_id=user.id
    )
    a_sent = await Friend.get_sent_requests_async(session=session, user_id=user.id)

    incoming = []
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

    sent = []
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
async def search_users(request: Request, q: str = Query(min_length=2)):
    """Search users by username."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result = await Friend.search_users_async(
        session=session, query=q, current_user_id=user.id
    )
    if a_result.is_not_ok():
        raise HTTPException(status_code=400, detail=a_result.message())

    friend_ids_result = await Friend.get_friend_ids_async(
        session=session, user_id=user.id
    )
    friend_ids = set(friend_ids_result.result()) if friend_ids_result.is_ok() else set()

    results = []
    for user_row in a_result.result():
        results.append(
            UserSearchResult(
                publicId=user_row.public_id,
                username=user_row.username,
                imageUrl=user_row.image.url if user_row.image else None,
                isFriend=user_row.id in friend_ids,
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
        raise HTTPException(status_code=404, detail="User not found")

    a_result = await Friend.send_friend_request_async(
        session=session,
        from_user_id=user.id,
        to_user_id=a_target.result().id,
        message=None,
    )
    if a_result.is_not_ok():
        raise HTTPException(status_code=400, detail=a_result.message())

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
        raise HTTPException(status_code=400, detail=a_result.message())

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
        raise HTTPException(status_code=400, detail=a_result.message())

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
        raise HTTPException(status_code=404, detail="User not found")

    a_result = await Friend.remove_friend_async(
        session=session, user_id=user.id, friend_user_id=a_target.result().id
    )
    if a_result.is_not_ok():
        raise HTTPException(status_code=400, detail=a_result.message())

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
        raise HTTPException(status_code=404, detail="User not found")

    a_result = await Friend.block_user_async(
        session=session, user_id=user.id, block_user_id=a_target.result().id
    )
    if a_result.is_not_ok():
        raise HTTPException(status_code=400, detail=a_result.message())

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
        raise HTTPException(status_code=404, detail="User not found")

    a_result = await Friend.unblock_user_async(
        session=session, user_id=user.id, blocked_user_id=a_target.result().id
    )
    if a_result.is_not_ok():
        raise HTTPException(status_code=400, detail=a_result.message())

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
        raise HTTPException(status_code=400, detail=a_result.message())

    activities = [
        FriendActivityItem(**item) for item in a_result.result()
    ]
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
        raise HTTPException(status_code=404, detail="User not found")

    a_result = await Sharing.share_media_async(
        session=session,
        sender_user_id=user.id,
        recipient_user_id=a_target.result().id,
        media_public_id=body.mediaPublicId,
        message=body.message,
    )
    if a_result.is_not_ok():
        raise HTTPException(status_code=400, detail=a_result.message())

    return OkResponse(status="OK")


@router.get("/share/inbox", response_model=SharedMediaInboxResponse)
async def get_share_inbox(request: Request):
    """Get media shared with me."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result = await Sharing.get_inbox_async(session=session, user_id=user.id)
    if a_result.is_not_ok():
        raise HTTPException(status_code=400, detail=a_result.message())

    items = []
    for share in a_result.result():
        sender = share.sender
        media = share.media
        items.append(
            SharedMediaItem(
                publicId=share.public_id,
                senderPublicId=sender.public_id,
                senderUsername=sender.username,
                senderImageUrl=sender.image.url if sender.image else None,
                mediaPublicId=media.public_id,
                mediaName=media.name,
                mediaImageUrl=media.image.url if media.image else None,
                mediaType="song",
                message=share.message,
                seen=share.seen,
                dateAdded=share.date_added,
            )
        )

    return SharedMediaInboxResponse(items=items)


@router.get("/share/sent", response_model=SharedMediaSentResponse)
async def get_share_sent(request: Request):
    """Get media I've shared."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result = await Sharing.get_sent_async(session=session, user_id=user.id)
    if a_result.is_not_ok():
        raise HTTPException(status_code=400, detail=a_result.message())

    items = []
    for share in a_result.result():
        recipient = share.recipient
        media = share.media
        items.append(
            SharedMediaItem(
                publicId=share.public_id,
                senderPublicId=recipient.public_id,
                senderUsername=recipient.username,
                senderImageUrl=recipient.image.url if recipient.image else None,
                mediaPublicId=media.public_id,
                mediaName=media.name,
                mediaImageUrl=media.image.url if media.image else None,
                mediaType="song",
                message=share.message,
                seen=share.seen,
                dateAdded=share.date_added,
            )
        )

    return SharedMediaSentResponse(items=items)


@router.post("/share/{share_public_id}/seen", response_model=OkResponse)
async def mark_share_seen(request: Request, share_public_id: str):
    """Mark a shared media as seen."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result = await Sharing.mark_as_seen_async(
        session=session, user_id=user.id, share_public_id=share_public_id
    )
    if a_result.is_not_ok():
        raise HTTPException(status_code=400, detail=a_result.message())

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
        raise HTTPException(status_code=404, detail="User not found")

    a_result = await ListenTogether.invite_async(
        session=session, host_user_id=user.id, guest_user_id=a_target.result().id
    )
    if a_result.is_not_ok():
        raise HTTPException(status_code=400, detail=a_result.message())

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
        raise HTTPException(status_code=400, detail=a_result.message())

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
        raise HTTPException(status_code=400, detail=a_result.message())

    return OkResponse(status="OK")


@router.post("/listen-together/sync", response_model=OkResponse)
async def sync_session(request: Request, body: ListenTogetherSyncRequest):
    """Sync playback in a listen together session (host only)."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    media_id = None
    if body.mediaPublicId:
        from backend.core.access.bookmarkAccess import BookmarkAccess
        a_media = await BookmarkAccess.get_media_by_public_id_async(
            session=session, media_public_id=body.mediaPublicId
        )
        if a_media.is_ok():
            media_id = a_media.result().id

    a_result = await ListenTogether.sync_async(
        session=session,
        user_id=user.id,
        session_public_id=body.sessionPublicId,
        current_media_id=media_id,
        current_time_ms=body.currentTimeMs,
        is_playing=body.isPlaying,
        queue_json=body.queueJson,
    )
    if a_result.is_not_ok():
        raise HTTPException(status_code=400, detail=a_result.message())

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
        raise HTTPException(status_code=400, detail=a_result.message())

    sessions = []
    for s in a_result.result():
        host = s.host
        guest = s.guest
        current_media = s.current_media
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
                currentMediaName=current_media.name if current_media else None,
                currentMediaImageUrl=current_media.image.url if current_media and current_media.image else None,
                currentTimeMs=s.current_time_ms,
                isPlaying=s.is_playing,
                status="active" if s.status_key == ListenTogetherStatusEnum.ACTIVE.value else "ended",
            )
        )

    sessions.reverse()
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
        raise HTTPException(status_code=404, detail="User not found")

    target = a_target.result()

    from backend.core.requests.userStatsRequest import UserStatsRequest
    stats_req = UserStatsRequest(range="7d")

    a_stats = await StatsFramework.get_user_stats_async(
        session=session,
        user_id=target.id,
        range_value=stats_req.range,
    )

    a_level = await Levels.get_user_level_async(session=session, user_id=target.id)

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


@router.get("/{user_public_id}/streak", response_model=dict)
async def get_friend_streak(request: Request, user_public_id: str):
    """Get a friend's streak."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_target = await Friend.get_user_by_public_id_async(
        session=session, public_id=user_public_id
    )
    if a_target.is_not_ok():
        raise HTTPException(status_code=404, detail="User not found")

    a_streak = await StreakBattle.get_streak_for_user_async(
        session=session, user_id=a_target.result().id
    )

    streak = a_streak.result() if a_streak.is_ok() else 0
    return {"currentStreak": streak}


@router.get("/compare/{user_public_id}", response_model=CompareStatsResponse)
async def compare_stats(request: Request, user_public_id: str):
    """Compare current user's stats with a friend."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_target = await Friend.get_user_by_public_id_async(
        session=session, public_id=user_public_id
    )
    if a_target.is_not_ok():
        raise HTTPException(status_code=404, detail="User not found")

    target = a_target.result()

    from backend.core.requests.userStatsRequest import UserStatsRequest
    stats_req = UserStatsRequest(range="7d")

    a_my_stats = await StatsFramework.get_user_stats_async(
        session=session, user_id=user.id, range_value=stats_req.range,
    )
    a_friend_stats = await StatsFramework.get_user_stats_async(
        session=session, user_id=target.id, range_value=stats_req.range,
    )

    a_my_level = await Levels.get_user_level_async(session=session, user_id=user.id)
    a_friend_level = await Levels.get_user_level_async(
        session=session, user_id=target.id
    )
    a_vibe = await Vibe.get_vibe_score_async(
        session=session, user_id=user.id, friend_user_id=target.id
    )

    my_stats = a_my_stats.result() if a_my_stats.is_ok() else None
    friend_stats = a_friend_stats.result() if a_friend_stats.is_ok() else None

    my_level_row = a_my_level.result() if a_my_level.is_ok() else None
    friend_level_row = a_friend_level.result() if a_friend_level.is_ok() else None

    vibe = a_vibe.result() if a_vibe.is_ok() else {"score": 0, "descriptor": ""}

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
        vibeScore=vibe.get("score", 0),
        vibeDescriptor=vibe.get("descriptor", ""),
    )


# ─── Levels & Leaderboard ─────────────────────────────────────────────────────


@router.get("/levels", response_model=UserLevelResponse)
async def get_my_level(request: Request):
    """Get current user's level info."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_level = await Levels.get_user_level_async(session=session, user_id=user.id)
    if a_level.is_not_ok():
        raise HTTPException(status_code=400, detail=a_level.message())

    level_row = a_level.result()
    a_configs = await Levels.get_level_configs_async(session=session)
    configs = a_configs.result() if a_configs.is_ok() else []

    next_config = None
    for c in configs:
        if c.level > level_row.level:
            next_config = c
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
        raise HTTPException(status_code=404, detail="User not found")

    target = a_target.result()
    a_level = await Levels.get_user_level_async(
        session=session, user_id=target.id
    )
    if a_level.is_not_ok():
        raise HTTPException(status_code=400, detail=a_level.message())

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

    a_friend_ids = await Friend.get_friend_ids_async(
        session=session, user_id=user.id
    )
    friend_ids = a_friend_ids.result() if a_friend_ids.is_ok() else []

    all_user_ids = [user.id] + friend_ids

    entries = []
    a_configs = await Levels.get_level_configs_async(session=session)
    configs = a_configs.result() if a_configs.is_ok() else []

    current_user_entry = None

    for uid in all_user_ids:
        a_level = await Levels.get_user_level_async(session=session, user_id=uid)
        if a_level.is_not_ok():
            continue

        level_row = a_level.result()
        a_user = await Friend.get_user_by_public_id_async(
            session=session, public_id=""
        )
        from backend.core.access.userAccess import UserAccess
        a_user_row = await UserAccess.get_user_from_id(
            session=session, user_id=uid
        )
        if a_user_row.is_not_ok():
            continue

        user_row = a_user_row.result()
        title = ""
        for c in configs:
            if c.level == level_row.level:
                title = c.title
                break

        xp_to_next = 0
        for c in configs:
            if c.level == level_row.level + 1:
                xp_to_next = c.xp_required - level_row.xp
                break

        a_streak = await StreakBattle.get_streak_for_user_async(
            session=session, user_id=uid
        )

        entry = UserLevelResponse(
            userId=user_row.public_id,
            username=user_row.username,
            imageUrl=user_row.image.url if user_row.image else None,
            level=level_row.level,
            xp=level_row.xp,
            xpToNext=max(0, xp_to_next),
            title=title,
            streak=a_streak.result() if a_streak.is_ok() else 0,
        )

        if uid == user.id:
            current_user_entry = entry
        else:
            entries.append(entry)

    entries.sort(key=lambda e: e.xp, reverse=True)

    return LeaderboardResponse(
        entries=entries,
        currentUser=current_user_entry,
    )


# ─── Vibe Score ───────────────────────────────────────────────────────────────


@router.get("/{user_public_id}/vibe", response_model=dict)
async def get_vibe_score(request: Request, user_public_id: str):
    """Get vibe score with a friend."""
    user = _get_user(request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_target = await Friend.get_user_by_public_id_async(
        session=session, public_id=user_public_id
    )
    if a_target.is_not_ok():
        raise HTTPException(status_code=404, detail="User not found")

    a_result = await Vibe.get_vibe_score_async(
        session=session, user_id=user.id, friend_user_id=a_target.result().id
    )
    if a_result.is_not_ok():
        raise HTTPException(status_code=400, detail=a_result.message())

    return a_result.result()
