from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.friend.listenTogether import (
    ListenTogetherSessionRow,
)
from core.access.friend.friendAccess import FriendAccess
from core.access.friend.listenTogetherAccess import ListenTogetherAccess
from core.access.mediaAccess import MediaAccess
from core.enums.friend.listenTogetherStatusEnum import (
    ListenTogetherStatusEnum,
)
from core.framework.friend.friend import Friend
from core.framework.friend.notifications import notify_after_commit
from core.framework.media.media import Media
from logger import getLogger
from result import Result, ResultCode

logger = getLogger(__name__)


class ListenTogether:
    @staticmethod
    async def invite_async(
        session: AsyncSession, host_user_id: int, guest_user_id: int
    ) -> Result[ListenTogetherSessionRow]:
        if host_user_id == guest_user_id:
            return Result(
                code=ResultCode.BAD_REQUEST,
                message="Cannot invite yourself to a session",
            )
        lock = await FriendAccess.lock_users_async(session, [host_user_id, guest_user_id])
        if lock.is_not_ok():
            logger.error(f"Error locking session participants. {lock.info()}")
            return Result(code=lock.code(), message=lock.message())
        for participant in (host_user_id, guest_user_id):
            existing = await ListenTogetherAccess.get_active_sessions_for_user_async(
                session, participant
            )
            if existing.is_not_ok():
                logger.error(f"Error checking participant sessions. {existing.info()}")
                return Result(code=existing.code(), message=existing.message())
            if existing.result():
                return Result(
                    code=ResultCode.ALREADY_EXISTS,
                    message="A participant already has a listening session",
                )
        allowed = await Friend.require_friend_async(session, host_user_id, guest_user_id)
        if allowed.is_not_ok():
            logger.error(f"Invitation denied. {allowed.info()}")
            return Result(code=allowed.code(), message=allowed.message())
        a_result = await ListenTogetherAccess.create_session_async(
            session=session, host_user_id=host_user_id, guest_user_id=guest_user_id
        )
        if a_result.is_not_ok():
            logger.error(
                f"Error creating listen together session. {a_result.info()}",
                exc_info=True,
            )
            return Result(code=a_result.code(), message=a_result.message())
        row = a_result.result()
        notify_after_commit(session, [row.host_user_id, row.guest_user_id], "listen_together_sync")
        return Result(code=ResultCode.OK, message="OK", result=row)

    @staticmethod
    async def join_async(
        session: AsyncSession, user_id: int, session_public_id: str
    ) -> Result[ListenTogetherSessionRow]:
        a_session = await ListenTogetherAccess.get_session_by_public_id_async(
            session=session, public_id=session_public_id
        )
        if a_session.is_not_ok():
            return Result(code=a_session.code(), message=a_session.message())
        session_row = a_session.result()
        if session_row.guest_user_id != user_id:
            return Result(
                code=ResultCode.BAD_REQUEST,
                message="You are not invited to this session",
            )
        if session_row.status == ListenTogetherStatusEnum.ENDED:
            return Result(code=ResultCode.BAD_REQUEST, message="This session is no longer active")
        allowed = await Friend.require_friend_async(
            session, session_row.host_user_id, session_row.guest_user_id
        )
        if allowed.is_not_ok():
            logger.error(f"Join denied. {allowed.info()}")
            return Result(code=allowed.code(), message=allowed.message())
        joined = await ListenTogetherAccess.join_session_async(session, session_row)
        if joined.is_ok():
            notify_after_commit(
                session,
                [session_row.host_user_id, session_row.guest_user_id],
                "listen_together_sync",
            )
        else:
            logger.error(f"Error joining session. {joined.info()}")
        return joined

    @staticmethod
    async def leave_async(
        session: AsyncSession, user_id: int, session_public_id: str
    ) -> ResultCode:
        a_session = await ListenTogetherAccess.get_session_by_public_id_async(
            session=session, public_id=session_public_id
        )
        if a_session.is_not_ok():
            return ResultCode(code=a_session.code(), message=a_session.message())
        session_row = a_session.result()
        if session_row.host_user_id != user_id and session_row.guest_user_id != user_id:
            return ResultCode(
                code=ResultCode.BAD_REQUEST,
                message="You are not part of this session",
            )
        a_result = await ListenTogetherAccess.end_session_async(
            session=session, session_row=session_row
        )
        if a_result.is_not_ok():
            logger.error(f"Error ending session. {a_result.info()}", exc_info=True)
            return ResultCode(code=a_result.code(), message=a_result.message())
        notify_after_commit(
            session,
            [session_row.host_user_id, session_row.guest_user_id],
            "listen_together_sync",
        )
        return ResultCode(code=ResultCode.OK, message="OK")

    @staticmethod
    async def sync_async(
        session: AsyncSession,
        user_id: int,
        session_public_id: str,
        media_public_id: str | None = None,
        current_time_ms: int | None = None,
        is_playing: bool | None = None,
        queue_json: str | None = None,
    ) -> Result[ListenTogetherSessionRow]:
        a_session = await ListenTogetherAccess.get_session_by_public_id_async(
            session=session, public_id=session_public_id
        )
        if a_session.is_not_ok():
            return Result(code=a_session.code(), message=a_session.message())
        session_row = a_session.result()
        if session_row.host_user_id != user_id:
            return Result(
                code=ResultCode.BAD_REQUEST,
                message="Only the host can sync the session",
            )
        if session_row.status == ListenTogetherStatusEnum.ENDED:
            return Result(code=ResultCode.BAD_REQUEST, message="Session has ended")
        allowed = await Friend.require_friend_async(
            session, session_row.host_user_id, session_row.guest_user_id
        )
        if allowed.is_not_ok():
            logger.error(f"Session sync denied. {allowed.info()}")
            return Result(code=allowed.code(), message=allowed.message())
        current_media_id = None
        if media_public_id:
            for viewer in (session_row.host_user_id, session_row.guest_user_id):
                visible = await Media.get_media_async(session, media_public_id, viewer)
                if visible.is_not_ok():
                    logger.error(f"Session media inaccessible. {visible.info()}")
                    return Result(code=visible.code(), message=visible.message())
                if visible.result().media.type not in ("song", "video", "station"):
                    return Result(
                        code=ResultCode.BAD_REQUEST,
                        message="Session media must be playable",
                    )
            media = await MediaAccess.get_media_from_public_id_async(session, media_public_id, None)
            if media.is_not_ok():
                logger.error(f"Session media missing. {media.info()}")
                return Result(code=media.code(), message=media.message())
            current_media_id = media.result().id
        a_result = await ListenTogetherAccess.update_session_sync_async(
            session=session,
            session_row=session_row,
            current_media_id=current_media_id,
            current_time_ms=current_time_ms,
            is_playing=is_playing,
            queue_json=queue_json,
        )
        if a_result.is_not_ok():
            logger.error(f"Error syncing session. {a_result.info()}", exc_info=True)
            return Result(code=a_result.code(), message=a_result.message())
        row = a_result.result()
        notify_after_commit(session, [row.host_user_id, row.guest_user_id], "listen_together_sync")
        return Result(code=ResultCode.OK, message="OK", result=row)

    @staticmethod
    async def get_session_async(
        session: AsyncSession, session_public_id: str
    ) -> Result[ListenTogetherSessionRow]:
        return await ListenTogetherAccess.get_session_by_public_id_async(
            session=session, public_id=session_public_id
        )

    @staticmethod
    async def get_active_sessions_async(
        session: AsyncSession, user_id: int
    ) -> Result[list[ListenTogetherSessionRow]]:
        return await ListenTogetherAccess.get_active_sessions_for_user_async(
            session=session, user_id=user_id
        )
