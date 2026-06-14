from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.access.friend.listenTogetherAccess import ListenTogetherAccess
from backend.core.access.db.ormModels.friend.listenTogether import (
    ListenTogetherSessionRow,
)
from backend.core.enums.friend.listenTogetherStatusEnum import (
    ListenTogetherStatusEnum,
)

logger = getLogger(__name__)


class ListenTogether:
    @staticmethod
    async def invite_async(
        session: AsyncSession, host_user_id: int, guest_user_id: int
    ) -> AResult[ListenTogetherSessionRow]:
        if host_user_id == guest_user_id:
            return AResult(
                code=AResultCode.BAD_REQUEST,
                message="Cannot invite yourself to a session",
            )
        a_existing = await ListenTogetherAccess.get_active_session_for_users_async(
            session=session, user_id_1=host_user_id, user_id_2=guest_user_id
        )
        if a_existing.is_ok() and a_existing.result() is not None:
            return AResult(
                code=AResultCode.ALREADY_EXISTS,
                message="An active session already exists between you and this user",
            )
        a_result = await ListenTogetherAccess.create_session_async(
            session=session, host_user_id=host_user_id, guest_user_id=guest_user_id
        )
        if a_result.is_not_ok():
            logger.error(
                f"Error creating listen together session. {a_result.info()}",
                exc_info=True,
            )
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def join_async(
        session: AsyncSession, user_id: int, session_public_id: str
    ) -> AResult[ListenTogetherSessionRow]:
        a_session = await ListenTogetherAccess.get_session_by_public_id_async(
            session=session, public_id=session_public_id
        )
        if a_session.is_not_ok():
            return AResult(code=a_session.code(), message=a_session.message())
        session_row = a_session.result()
        if session_row.guest_user_id != user_id:
            return AResult(
                code=AResultCode.BAD_REQUEST,
                message="You are not invited to this session",
            )
        if session_row.status != ListenTogetherStatusEnum.ACTIVE:
            return AResult(
                code=AResultCode.BAD_REQUEST, message="This session is no longer active"
            )
        return AResult(code=AResultCode.OK, message="OK", result=session_row)

    @staticmethod
    async def leave_async(
        session: AsyncSession, user_id: int, session_public_id: str
    ) -> AResultCode:
        a_session = await ListenTogetherAccess.get_session_by_public_id_async(
            session=session, public_id=session_public_id
        )
        if a_session.is_not_ok():
            return AResultCode(code=a_session.code(), message=a_session.message())
        session_row = a_session.result()
        if session_row.host_user_id != user_id and session_row.guest_user_id != user_id:
            return AResultCode(
                code=AResultCode.BAD_REQUEST,
                message="You are not part of this session",
            )
        a_result = await ListenTogetherAccess.end_session_async(
            session=session, session_row=session_row
        )
        if a_result.is_not_ok():
            logger.error(f"Error ending session. {a_result.info()}", exc_info=True)
            return AResultCode(code=a_result.code(), message=a_result.message())
        return AResultCode(code=AResultCode.OK, message="OK")

    @staticmethod
    async def sync_async(
        session: AsyncSession,
        user_id: int,
        session_public_id: str,
        current_media_id: int | None = None,
        current_time_ms: int | None = None,
        is_playing: bool | None = None,
        queue_json: str | None = None,
    ) -> AResult[ListenTogetherSessionRow]:
        a_session = await ListenTogetherAccess.get_session_by_public_id_async(
            session=session, public_id=session_public_id
        )
        if a_session.is_not_ok():
            return AResult(code=a_session.code(), message=a_session.message())
        session_row = a_session.result()
        if session_row.host_user_id != user_id:
            return AResult(
                code=AResultCode.BAD_REQUEST,
                message="Only the host can sync the session",
            )
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
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def get_session_async(
        session: AsyncSession, session_public_id: str
    ) -> AResult[ListenTogetherSessionRow]:
        return await ListenTogetherAccess.get_session_by_public_id_async(
            session=session, public_id=session_public_id
        )

    @staticmethod
    async def get_active_sessions_async(
        session: AsyncSession, user_id: int
    ) -> AResult[List[ListenTogetherSessionRow]]:
        return await ListenTogetherAccess.get_active_sessions_for_user_async(
            session=session, user_id=user_id
        )
