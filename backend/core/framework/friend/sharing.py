from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.access.friend.shareAccess import ShareAccess
from backend.core.access.friend.friendAccess import FriendAccess
from backend.core.access.db.ormModels.friend.sharedMedia import SharedMediaRow
from backend.core.enums.friend.friendStatusEnum import FriendStatusEnum

logger = getLogger(__name__)


class Sharing:
    @staticmethod
    async def share_media_async(
        session: AsyncSession,
        sender_user_id: int,
        recipient_user_id: int,
        media_public_id: str,
        message: str | None,
    ) -> AResult[SharedMediaRow]:
        if sender_user_id == recipient_user_id:
            return AResult(
                code=AResultCode.BAD_REQUEST, message="Cannot share media with yourself"
            )
        a_check = await FriendAccess.get_friend_relationship_async(
            session=session, user_id=sender_user_id, friend_user_id=recipient_user_id
        )
        if a_check.is_not_ok() or a_check.result() is None:
            return AResult(
                code=AResultCode.BAD_REQUEST,
                message="You are not friends with this user",
            )
        if a_check.result().status != FriendStatusEnum.ACCEPTED:
            return AResult(
                code=AResultCode.BAD_REQUEST,
                message="You are not friends with this user",
            )
        a_media = await ShareAccess.get_media_by_public_id_async(
            session=session, media_public_id=media_public_id
        )
        if a_media.is_not_ok():
            return AResult(code=a_media.code(), message=a_media.message())
        a_result = await ShareAccess.create_share_async(
            session=session,
            sender_user_id=sender_user_id,
            recipient_user_id=recipient_user_id,
            media_id=a_media.result().id,
            message=message,
        )
        if a_result.is_not_ok():
            logger.error(f"Error sharing media. {a_result.info()}", exc_info=True)
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def get_inbox_async(
        session: AsyncSession, user_id: int
    ) -> AResult[List[SharedMediaRow]]:
        a_result = await ShareAccess.get_inbox_async(session=session, user_id=user_id)
        if a_result.is_not_ok():
            logger.error(f"Error getting inbox. {a_result.info()}", exc_info=True)
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def get_sent_async(
        session: AsyncSession, user_id: int
    ) -> AResult[List[SharedMediaRow]]:
        a_result = await ShareAccess.get_sent_async(session=session, user_id=user_id)
        if a_result.is_not_ok():
            logger.error(f"Error getting sent shares. {a_result.info()}", exc_info=True)
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def mark_as_seen_async(
        session: AsyncSession, user_id: int, share_public_id: str
    ) -> AResult[SharedMediaRow]:
        a_share = await ShareAccess.get_share_by_public_id_async(
            session=session, public_id=share_public_id
        )
        if a_share.is_not_ok():
            return AResult(code=a_share.code(), message=a_share.message())
        share_row = a_share.result()
        if share_row.recipient_user_id != user_id:
            return AResult(
                code=AResultCode.BAD_REQUEST, message="This share was not sent to you"
            )
        a_result = await ShareAccess.mark_as_seen_async(
            session=session, share_row=share_row
        )
        if a_result.is_not_ok():
            logger.error(
                f"Error marking share as seen. {a_result.info()}", exc_info=True
            )
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def delete_share_async(
        session: AsyncSession, user_id: int, share_public_id: str
    ) -> AResultCode:
        a_share = await ShareAccess.get_share_by_public_id_async(
            session=session, public_id=share_public_id
        )
        if a_share.is_not_ok():
            return AResultCode(code=a_share.code(), message=a_share.message())
        share_row = a_share.result()
        if (
            share_row.sender_user_id != user_id
            and share_row.recipient_user_id != user_id
        ):
            return AResultCode(
                code=AResultCode.BAD_REQUEST,
                message="Not authorized to delete this share",
            )
        a_result = await ShareAccess.delete_share_async(
            session=session, share_row=share_row
        )
        if a_result.is_not_ok():
            logger.error(f"Error deleting share. {a_result.info()}", exc_info=True)
            return AResultCode(code=a_result.code(), message=a_result.message())
        return AResultCode(code=AResultCode.OK, message="OK")
