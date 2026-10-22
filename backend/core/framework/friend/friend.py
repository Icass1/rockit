from typing import List
from backend.core.framework.friend.notifications import notify_after_commit

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode

from backend.core.access.friend.friendAccess import FriendAccess
from backend.core.access.db.ormModels.user import UserRow
from backend.core.access.db.ormModels.friend.friend import FriendRow
from backend.core.access.db.ormModels.friend.friendRequest import FriendRequestRow

from backend.core.enums.friend.friendStatusEnum import FriendStatusEnum

logger = getLogger(__name__)


class Friend:
    @staticmethod
    async def require_friend_async(
        session: AsyncSession, user_id: int, friend_user_id: int
    ) -> AResultCode:
        allowed = await FriendAccess.are_friends_async(session, user_id, friend_user_id)
        if allowed.is_not_ok():
            logger.error(f"Error checking friendship. {allowed.info()}")
            return AResultCode(code=allowed.code(), message=allowed.message())
        if not allowed.result():
            return AResultCode(
                code=AResultCode.BAD_REQUEST,
                message="An accepted friendship is required",
            )
        return AResultCode(code=AResultCode.OK, message="OK")

    @staticmethod
    async def get_friends_async(
        session: AsyncSession, user_id: int
    ) -> AResult[List[FriendRow]]:
        a_result = await FriendAccess.get_friends_async(
            session=session, user_id=user_id
        )
        if a_result.is_not_ok():
            logger.error(f"Error getting friends. {a_result.info()}", exc_info=True)
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def search_users_async(
        session: AsyncSession, query: str, current_user_id: int
    ) -> AResult[List[UserRow]]:
        if len(query.strip()) < 2:
            return AResult(
                code=AResultCode.BAD_REQUEST,
                message="Query must be at least 2 characters",
            )
        a_result = await FriendAccess.search_users_async(
            session=session, query=query, current_user_id=current_user_id
        )
        if a_result.is_not_ok():
            logger.error(f"Error searching users. {a_result.info()}", exc_info=True)
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def send_friend_request_async(
        session: AsyncSession, from_user_id: int, to_user_id: int, message: str | None
    ) -> AResult[FriendRequestRow]:
        if from_user_id == to_user_id:
            return AResult(
                code=AResultCode.BAD_REQUEST,
                message="Cannot send friend request to yourself",
            )
        lock = await FriendAccess.lock_users_async(session, [from_user_id, to_user_id])
        if lock.is_not_ok():
            logger.error(f"Error locking friendship. {lock.info()}")
            return AResult(code=lock.code(), message=lock.message())
        reverse = await FriendAccess.get_friend_relationship_async(
            session, to_user_id, from_user_id
        )
        if reverse.is_not_ok() and reverse.code() != AResultCode.NOT_FOUND:
            logger.error(f"Error checking reverse relationship. {reverse.info()}")
            return AResult(code=reverse.code(), message=reverse.message())
        reverse_row = reverse.result() if reverse.is_ok() else None
        if reverse_row is not None and reverse_row.status == FriendStatusEnum.BLOCKED:
            return AResult(
                code=AResultCode.BAD_REQUEST, message="Cannot send this request"
            )
        pending = await FriendAccess.get_pending_between_async(
            session, from_user_id, to_user_id
        )
        if pending.is_not_ok() and pending.code() != AResultCode.NOT_FOUND:
            logger.error(f"Error checking pending request. {pending.info()}")
            return AResult(code=pending.code(), message=pending.message())
        if pending.is_ok():
            return AResult(
                code=AResultCode.BAD_REQUEST,
                message="A friend request is already pending",
            )
        a_check = await FriendAccess.get_friend_relationship_async(
            session=session, user_id=from_user_id, friend_user_id=to_user_id
        )
        if a_check.is_not_ok() and a_check.code() != AResultCode.NOT_FOUND:
            logger.error(f"Error checking friendship. {a_check.info()}")
            return AResult(code=a_check.code(), message=a_check.message())
        if a_check.is_ok():
            existing = a_check.result()
            assert existing is not None
            if existing.status == FriendStatusEnum.ACCEPTED:
                return AResult(
                    code=AResultCode.ALREADY_EXISTS, message="Already friends"
                )
            if existing.status == FriendStatusEnum.PENDING:
                return AResult(
                    code=AResultCode.ALREADY_EXISTS,
                    message="Friend request already pending",
                )
            if existing.status == FriendStatusEnum.BLOCKED:
                return AResult(
                    code=AResultCode.BAD_REQUEST,
                    message="Cannot send request to blocked user",
                )
        a_result = await FriendAccess.create_friend_request_async(
            session=session,
            from_user_id=from_user_id,
            to_user_id=to_user_id,
            message=message,
        )
        if a_result.is_not_ok():
            logger.error(
                f"Error creating friend request. {a_result.info()}", exc_info=True
            )
            return AResult(code=a_result.code(), message=a_result.message())
        notify_after_commit(session, [from_user_id, to_user_id])
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def accept_friend_request_async(
        session: AsyncSession, user_id: int, request_public_id: str
    ) -> AResult[FriendRow]:
        a_req = await FriendAccess.get_friend_request_by_public_id_async(
            session=session, public_id=request_public_id
        )
        if a_req.is_not_ok():
            return AResult(code=a_req.code(), message=a_req.message())
        request_row = a_req.result()
        if request_row.to_user_id != user_id:
            return AResult(
                code=AResultCode.BAD_REQUEST,
                message="This request was not sent to you",
            )
        lock = await FriendAccess.lock_users_async(
            session, [request_row.from_user_id, user_id]
        )
        if lock.is_not_ok():
            logger.error(f"Error locking friend request. {lock.info()}")
            return AResult(code=lock.code(), message=lock.message())
        # Re-read after acquiring the pair lock; another accept/block may have won.
        refreshed = await FriendAccess.get_friend_request_by_public_id_async(
            session, request_public_id
        )
        if refreshed.is_not_ok():
            logger.error(f"Error refreshing friend request. {refreshed.info()}")
            return AResult(code=refreshed.code(), message=refreshed.message())
        request_row = refreshed.result()
        if request_row.status != FriendStatusEnum.PENDING:
            return AResult(
                code=AResultCode.BAD_REQUEST, message="Request is no longer pending"
            )
        a_update = await FriendAccess.update_friend_request_status_async(
            session=session,
            request_row=request_row,
            status_key=FriendStatusEnum.ACCEPTED.value,
        )
        if a_update.is_not_ok():
            return AResult(code=a_update.code(), message=a_update.message())
        a_add = await FriendAccess.add_friend_async(
            session=session, user_id=request_row.from_user_id, friend_user_id=user_id
        )
        if a_add.is_not_ok():
            return AResult(code=a_add.code(), message=a_add.message())
        a_add2 = await FriendAccess.add_friend_async(
            session=session, user_id=user_id, friend_user_id=request_row.from_user_id
        )
        if a_add2.is_not_ok():
            return AResult(code=a_add2.code(), message=a_add2.message())
        notify_after_commit(session, [request_row.from_user_id, user_id])
        return AResult(code=AResultCode.OK, message="OK", result=a_add.result())

    @staticmethod
    async def reject_friend_request_async(
        session: AsyncSession, user_id: int, request_public_id: str
    ) -> AResultCode:
        a_req = await FriendAccess.get_friend_request_by_public_id_async(
            session=session, public_id=request_public_id
        )
        if a_req.is_not_ok():
            return AResultCode(code=a_req.code(), message=a_req.message())
        request_row = a_req.result()
        if request_row.to_user_id != user_id:
            return AResultCode(
                code=AResultCode.BAD_REQUEST,
                message="This request was not sent to you",
            )
        lock = await FriendAccess.lock_users_async(
            session, [request_row.from_user_id, user_id]
        )
        if lock.is_not_ok():
            logger.error(f"Error locking friend request. {lock.info()}")
            return lock
        refreshed = await FriendAccess.get_friend_request_by_public_id_async(
            session, request_public_id
        )
        if refreshed.is_not_ok():
            logger.error(f"Error refreshing friend request. {refreshed.info()}")
            return AResultCode(code=refreshed.code(), message=refreshed.message())
        request_row = refreshed.result()
        if request_row.status != FriendStatusEnum.PENDING:
            return AResultCode(
                code=AResultCode.BAD_REQUEST, message="Request is no longer pending"
            )
        a_update = await FriendAccess.update_friend_request_status_async(
            session=session,
            request_row=request_row,
            status_key=FriendStatusEnum.REJECTED.value,
        )
        if a_update.is_not_ok():
            return AResultCode(code=a_update.code(), message=a_update.message())
        notify_after_commit(session, [request_row.from_user_id, user_id])
        return AResultCode(code=AResultCode.OK, message="OK")

    @staticmethod
    async def get_pending_requests_async(
        session: AsyncSession, user_id: int
    ) -> AResult[List[FriendRequestRow]]:
        a_result = await FriendAccess.get_pending_requests_for_user_async(
            session=session, user_id=user_id
        )
        if a_result.is_not_ok():
            logger.error(
                f"Error getting pending requests. {a_result.info()}", exc_info=True
            )
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def get_sent_requests_async(
        session: AsyncSession, user_id: int
    ) -> AResult[List[FriendRequestRow]]:
        a_result = await FriendAccess.get_sent_requests_async(
            session=session, user_id=user_id
        )
        if a_result.is_not_ok():
            logger.error(
                f"Error getting sent requests. {a_result.info()}", exc_info=True
            )
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def remove_friend_async(
        session: AsyncSession, user_id: int, friend_user_id: int
    ) -> AResultCode:
        lock = await FriendAccess.lock_users_async(session, [user_id, friend_user_id])
        if lock.is_not_ok():
            logger.error(f"Error locking friendship. {lock.info()}")
            return lock
        allowed = await Friend.require_friend_async(session, user_id, friend_user_id)
        if allowed.is_not_ok():
            logger.error(f"Removal denied. {allowed.info()}")
            return allowed
        result = await FriendAccess.disconnect_async(session, user_id, friend_user_id)
        if result.is_not_ok():
            logger.error(f"Error removing friendship. {result.info()}")
            return result
        notify_after_commit(session, [user_id, friend_user_id])
        notify_after_commit(session, [user_id, friend_user_id], "listen_together_sync")
        return result

    @staticmethod
    async def block_user_async(
        session: AsyncSession, user_id: int, block_user_id: int
    ) -> AResultCode:
        if user_id == block_user_id:
            return AResultCode(
                code=AResultCode.BAD_REQUEST, message="Cannot block yourself"
            )
        lock = await FriendAccess.lock_users_async(session, [user_id, block_user_id])
        if lock.is_not_ok():
            logger.error(f"Error locking friendship. {lock.info()}")
            return lock
        result = await FriendAccess.disconnect_async(
            session, user_id, block_user_id, block=True
        )
        if result.is_not_ok():
            logger.error(f"Error blocking user. {result.info()}")
            return result
        notify_after_commit(session, [user_id, block_user_id])
        notify_after_commit(session, [user_id, block_user_id], "listen_together_sync")
        return result

    @staticmethod
    async def unblock_user_async(
        session: AsyncSession, user_id: int, blocked_user_id: int
    ) -> AResultCode:
        a_rel = await FriendAccess.get_friend_relationship_async(
            session=session, user_id=user_id, friend_user_id=blocked_user_id
        )
        if a_rel.is_not_ok() or a_rel.result() is None:
            return AResultCode(
                code=AResultCode.NOT_FOUND, message="Block relationship not found"
            )
        existing = a_rel.result()
        assert existing is not None
        if existing.status != FriendStatusEnum.BLOCKED:
            return AResultCode(
                code=AResultCode.BAD_REQUEST, message="User is not blocked"
            )
        result = await FriendAccess.delete_friend_async(
            session=session, friend_row=existing
        )
        if result.is_not_ok():
            logger.error(f"Error unblocking user. {result.info()}")
            return AResultCode(code=result.code(), message=result.message())
        notify_after_commit(session, [user_id, blocked_user_id])
        return AResultCode(code=AResultCode.OK, message="OK")

    @staticmethod
    async def get_user_by_public_id_async(
        session: AsyncSession, public_id: str
    ) -> AResult[UserRow]:
        return await FriendAccess.get_user_by_public_id_async(
            session=session, public_id=public_id
        )

    @staticmethod
    async def get_friend_ids_async(
        session: AsyncSession, user_id: int
    ) -> AResult[List[int]]:
        return await FriendAccess.get_friend_ids_async(session=session, user_id=user_id)

    @staticmethod
    async def get_blocked_async(
        session: AsyncSession, user_id: int
    ) -> AResult[list[FriendRow]]:
        result = await FriendAccess.get_blocked_async(session, user_id)
        if result.is_not_ok():
            logger.error(f"Error getting blocked users. {result.info()}")
        return result
