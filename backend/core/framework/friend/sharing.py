from typing import List
from backend.constants import BACKEND_URL
from backend.core.access.collectionAccess import CollectionAccess
from backend.core.access.friend.mediaSummaryAccess import MediaSummaryAccess
from backend.core.enums.mediaTypeEnum import MEDIA_TYPE_NAMES
from backend.core.responses.friend.sharedMediaResponse import SharedMediaItem
from backend.core.framework.friend.notifications import notify_after_commit

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.access.friend.shareAccess import ShareAccess
from backend.core.framework.friend.friend import Friend
from backend.core.framework.media.media import Media
from backend.core.access.db.ormModels.friend.sharedMedia import SharedMediaRow

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
        allowed = await Friend.require_friend_async(
            session, sender_user_id, recipient_user_id
        )
        if allowed.is_not_ok():
            logger.error(f"Share denied. {allowed.info()}")
            return AResult(code=allowed.code(), message=allowed.message())
        for viewer in (sender_user_id, recipient_user_id):
            visible = await Media.get_media_async(session, media_public_id, viewer)
            if visible.is_not_ok():
                logger.error(f"Shared media is inaccessible. {visible.info()}")
                return AResult(code=visible.code(), message=visible.message())
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
        notify_after_commit(session, [sender_user_id, recipient_user_id])
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
        notify_after_commit(
            session, [share_row.sender_user_id, share_row.recipient_user_id]
        )
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
        notify_after_commit(
            session, [share_row.sender_user_id, share_row.recipient_user_id]
        )
        return AResultCode(code=AResultCode.OK, message="OK")

    @staticmethod
    async def present_async(
        session: AsyncSession, user_id: int, shares: list[SharedMediaRow]
    ) -> AResult[list[SharedMediaItem]]:
        if not shares:
            return AResult(code=AResultCode.OK, message="OK", result=[])
        public_ids = [share.media.public_id for share in shares]
        records = await CollectionAccess.records_async(session, public_ids, user_id)
        images = await MediaSummaryAccess.images_async(session, public_ids)
        for result in (records, images):
            if result.is_not_ok():
                logger.error(f"Error resolving shared media. {result.info()}")
                return AResult(code=result.code(), message=result.message())
        by_id = {record.public_id: record for record in records.result()}
        items: list[SharedMediaItem] = []
        for share in shares:
            record = by_id.get(share.media.public_id)
            if record is None:
                continue
            image_id = record.data.get("image_public_id")
            image_url = (
                f"{BACKEND_URL}/media/image/{image_id}"
                if image_id
                else images.result().get(record.public_id)
            )
            items.append(
                SharedMediaItem(
                    publicId=share.public_id,
                    senderPublicId=share.sender.public_id,
                    senderUsername=share.sender.username,
                    senderImageUrl=(
                        share.sender.image.url if share.sender.image else None
                    ),
                    recipientPublicId=share.recipient.public_id,
                    recipientUsername=share.recipient.username,
                    mediaPublicId=record.public_id,
                    mediaName=record.name,
                    mediaImageUrl=image_url,
                    mediaType=MEDIA_TYPE_NAMES[record.media_type_key],
                    message=share.message,
                    seen=share.seen,
                    dateAdded=share.date_added,
                )
            )
        return AResult(code=AResultCode.OK, message="OK", result=items)
