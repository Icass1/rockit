from logging import Logger

from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.userRequest import UserRequestRow
from core.access.notificationAccess import NotificationAccess
from core.access.requestAccess import RequestAccess
from core.enums.requestStatusEnum import RequestStatusEnum
from core.enums.requestTypeEnum import RequestTypeEnum
from core.framework.admin.metadataReview import MetadataReview
from core.framework.contentRating import ContentRatings
from core.framework.friend.notifications import notify_notifications_after_commit
from core.framework.lyricsCorrections import LyricsCorrections
from core.framework.lyricsSources import LyricsSources
from core.responses.userRequestResponse import (
    AdminRequestStatsResponse,
    UserRequestListResponse,
    UserRequestResponse,
)
from logger import getLogger
from result import Result, ResultCode

logger: Logger = getLogger(__name__)


async def _map_request_to_response(
    session: AsyncSession, row: UserRequestRow
) -> Result[UserRequestResponse]:

    a_result_public_id = await RequestAccess.get_media_public_id_from_id_async(
        session=session, media_id=row.media_id
    )
    media_public_id: str = ""
    if a_result_public_id.is_ok():
        media_public_id = a_result_public_id.result()

    user_name: str | None = None
    user_image: str | None = None
    a_result_user = await RequestAccess.get_user_info_async(session=session, user_id=row.user_id)
    if a_result_user.is_ok():
        user = a_result_user.result()
        user_name = user.username
        user_image = user.image.public_id if user.image else None

    return Result(
        code=ResultCode.OK,
        message="OK",
        result=UserRequestResponse(
            publicId=row.public_id,
            mediaPublicId=media_public_id,
            requestType=RequestTypeEnum(row.request_type_key),
            proposedValue=row.proposed_value,
            comment=row.comment,
            status=RequestStatusEnum(row.status_key),
            reviewComment=row.review_comment,
            dateAdded=row.date_added,
            userName=user_name,
            userImage=user_image,
        ),
    )


class UserRequest:
    @staticmethod
    async def create_request_async(
        session: AsyncSession,
        user_id: int,
        public_id: str,
        request_type: RequestTypeEnum,
        proposed_value: str,
        media_public_id: str,
        comment: str | None = None,
    ) -> Result[UserRequestResponse]:
        a_result_media = await RequestAccess.get_media_id_from_public_id_async(
            session=session, public_id=media_public_id
        )
        if a_result_media.is_not_ok():
            logger.error(f"Media not found. {a_result_media.info()}")
            return Result(
                code=a_result_media.code(),
                message=a_result_media.message(),
            )
        media_id = a_result_media.result()

        if request_type == RequestTypeEnum.LYRICS:
            handler = (
                LyricsSources
                if LyricsSources.is_proposal(payload=proposed_value)
                else LyricsCorrections
            )
            prepared = await handler.prepare_async(
                session=session, media_id=media_id, payload=proposed_value
            )
            if prepared.is_not_ok():
                logger.warning("Cannot create lyrics request: %s", prepared.info())
                return Result(code=prepared.code(), message=prepared.message())
            proposed_value = prepared.result()

        if request_type in {
            RequestTypeEnum.METADATA,
            RequestTypeEnum.TITLE,
            RequestTypeEnum.ARTIST,
            RequestTypeEnum.ALBUM,
            RequestTypeEnum.GENRE,
        }:
            changes = MetadataReview.changes(request_type=request_type, payload=proposed_value)
            if changes.is_not_ok():
                return Result(code=changes.code(), message=changes.message())

        if request_type == RequestTypeEnum.METADATA:
            rating = ContentRatings.parse_metadata_rating(payload=proposed_value)
            if rating.is_not_ok():
                logger.warning("Cannot create metadata request: %s", rating.info())
                return Result(code=rating.code(), message=rating.message())

        a_result = await RequestAccess.create_request_async(
            session=session,
            user_id=user_id,
            public_id=public_id,
            request_type=request_type,
            proposed_value=proposed_value,
            media_id=media_id,
            comment=comment,
        )
        if a_result.is_not_ok():
            logger.error(f"Error creating request. {a_result.info()}")
            return Result(code=a_result.code(), message=a_result.message())

        notifications = await NotificationAccess.deliver_admin_request_async(session=session)
        if notifications.is_not_ok():
            logger.error("Cannot notify admins about request: %s", notifications.info())
            return Result(code=notifications.code(), message=notifications.message())
        for admin_id in notifications.result():
            notify_notifications_after_commit(session=session, user_id=admin_id)

        return await _map_request_to_response(session=session, row=a_result.result())

    @staticmethod
    async def get_all_requests_async(
        session: AsyncSession,
        status: RequestStatusEnum | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Result[UserRequestListResponse]:
        a_result = await RequestAccess.get_all_requests_async(
            session=session, status=status, limit=limit, offset=offset
        )
        if a_result.is_not_ok():
            logger.error(f"Error getting requests. {a_result.info()}")
            return Result(code=a_result.code(), message=a_result.message())

        responses: list[UserRequestResponse] = []
        for row in a_result.result():
            a_result_resp = await _map_request_to_response(session=session, row=row)
            if a_result_resp.is_ok():
                responses.append(a_result_resp.result())

        return Result(
            code=ResultCode.OK,
            message="OK",
            result=UserRequestListResponse(requests=responses),
        )

    @staticmethod
    async def get_user_requests_async(
        session: AsyncSession,
        user_id: int,
        limit: int = 50,
        offset: int = 0,
    ) -> Result[UserRequestListResponse]:
        a_result = await RequestAccess.get_user_requests_async(
            session=session, user_id=user_id, limit=limit, offset=offset
        )
        if a_result.is_not_ok():
            logger.error(f"Error getting user requests. {a_result.info()}")
            return Result(code=a_result.code(), message=a_result.message())

        responses: list[UserRequestResponse] = []
        for row in a_result.result():
            a_result_resp = await _map_request_to_response(session=session, row=row)
            if a_result_resp.is_ok():
                responses.append(a_result_resp.result())

        return Result(
            code=ResultCode.OK,
            message="OK",
            result=UserRequestListResponse(requests=responses),
        )

    @staticmethod
    async def review_request_async(
        session: AsyncSession,
        public_id: str,
        reviewer_id: int,
        status: RequestStatusEnum,
        review_comment: str | None = None,
    ) -> Result[UserRequestResponse]:
        a_result_request = await RequestAccess.get_request_by_public_id_async(
            session=session, public_id=public_id
        )
        if a_result_request.is_not_ok():
            logger.error(f"Request not found. {a_result_request.info()}")
            return Result(code=a_result_request.code(), message=a_result_request.message())

        request_row = a_result_request.result()
        if request_row.status_key != RequestStatusEnum.PENDING.value:
            if request_row.status_key == status.value:
                return await _map_request_to_response(session=session, row=request_row)
            logger.warning("Cannot review a terminal request again")
            return Result(code=ResultCode.BAD_REQUEST, message="Request already reviewed")
        if status == RequestStatusEnum.PENDING:
            logger.warning("A review must accept or reject")
            return Result(code=ResultCode.BAD_REQUEST, message="Invalid review status")
        if (
            request_row.request_type_key == RequestTypeEnum.LYRICS.value
            and status == RequestStatusEnum.ACCEPTED
        ):
            handler = (
                LyricsSources
                if LyricsSources.is_proposal(payload=request_row.proposed_value)
                else LyricsCorrections
            )
            checked = await handler.validate_review_async(
                session=session, media_id=request_row.media_id, payload=request_row.proposed_value
            )
            if checked.is_not_ok():
                logger.warning("Lyrics review rejected: %s", checked.info())
                return Result(code=checked.code(), message=checked.message())
        if (
            request_row.request_type_key == RequestTypeEnum.COVER_ART.value
            and status == RequestStatusEnum.ACCEPTED
        ):
            logger.warning("Cover art requests require a validated uploaded image")
            return Result(
                code=ResultCode.BAD_REQUEST,
                message="ADMIN_METADATA_COVER_UPLOAD_REQUIRED",
            )
        metadata_types = {
            RequestTypeEnum.METADATA,
            RequestTypeEnum.TITLE,
            RequestTypeEnum.ARTIST,
            RequestTypeEnum.ALBUM,
            RequestTypeEnum.GENRE,
        }
        if (
            RequestTypeEnum(request_row.request_type_key) in metadata_types
            and status == RequestStatusEnum.ACCEPTED
        ):
            changes = MetadataReview.changes(
                RequestTypeEnum(request_row.request_type_key), request_row.proposed_value
            )
            if changes.is_not_ok():
                return Result(code=changes.code(), message=changes.message())
            if changes.result():
                applied = await MetadataReview.apply_async(
                    session=session, media_id=request_row.media_id, changes=changes.result()
                )
                if applied.is_not_ok():
                    logger.warning("Cannot apply reviewed metadata: %s", applied.info())
                    return Result(code=applied.code(), message=applied.message())
        if (
            request_row.request_type_key == RequestTypeEnum.METADATA.value
            and status == RequestStatusEnum.ACCEPTED
        ):
            rating = ContentRatings.parse_metadata_rating(payload=request_row.proposed_value)
            if rating.is_not_ok():
                logger.warning("Invalid reviewed metadata: %s", rating.info())
                return Result(code=rating.code(), message=rating.message())
            proposed_rating = rating.result()[0] if rating.result() else None
            if proposed_rating is not None:
                identity = await RequestAccess.get_media_public_id_from_id_async(
                    session=session, media_id=request_row.media_id
                )
                if identity.is_not_ok():
                    logger.warning("Reviewed song unavailable: %s", identity.info())
                    return Result(code=identity.code(), message=identity.message())
                applied = await ContentRatings.record_async(
                    session=session,
                    public_id=identity.result(),
                    value=(
                        True
                        if proposed_rating.value == "explicit"
                        else False
                        if proposed_rating.value == "clean"
                        else None
                    ),
                    source="manual:review",
                    manual=True,
                )
                if applied.is_not_ok():
                    logger.error("Cannot apply reviewed content rating: %s", applied.info())
                    return Result(code=applied.code(), message=applied.message())
        if (
            request_row.request_type_key == RequestTypeEnum.LYRICS.value
            and status == RequestStatusEnum.REJECTED
            and LyricsSources.is_proposal(payload=request_row.proposed_value)
        ):
            try:
                discarded = LyricsSources.discard_text(payload=request_row.proposed_value)
            except ValueError:
                logger.warning("Rejected source snapshot was already unavailable")
                discarded = ""
            a_result = await RequestAccess.update_request_status_async(
                session=session,
                request_id=request_row.id,
                status=status,
                reviewed_by=reviewer_id,
                review_comment=review_comment,
                proposed_value=discarded,
            )
        else:
            a_result = await RequestAccess.update_request_status_async(
                session=session,
                request_id=request_row.id,
                status=status,
                reviewed_by=reviewer_id,
                review_comment=review_comment,
            )
        if a_result.is_not_ok():
            logger.error(f"Error updating request. {a_result.info()}")
            return Result(code=a_result.code(), message=a_result.message())

        return await _map_request_to_response(session=session, row=a_result.result())

    @staticmethod
    async def get_stats_async(
        session: AsyncSession,
    ) -> Result[AdminRequestStatsResponse]:
        a_result_total = await RequestAccess.get_total_count_async(session=session)
        if a_result_total.is_not_ok():
            logger.error(f"Error getting total. {a_result_total.info()}")
            return Result(
                code=a_result_total.code(),
                message=a_result_total.message(),
            )

        a_result_pending = await RequestAccess.get_count_by_status_async(
            session=session, status_value="pending"
        )
        if a_result_pending.is_not_ok():
            logger.error(f"Error getting pending. {a_result_pending.info()}")
            return Result(
                code=a_result_pending.code(),
                message=a_result_pending.message(),
            )

        a_result_accepted = await RequestAccess.get_count_by_status_async(
            session=session, status_value="accepted"
        )
        if a_result_accepted.is_not_ok():
            logger.error(f"Error getting accepted. {a_result_accepted.info()}")
            return Result(
                code=a_result_accepted.code(),
                message=a_result_accepted.message(),
            )

        a_result_rejected = await RequestAccess.get_count_by_status_async(
            session=session, status_value="rejected"
        )
        if a_result_rejected.is_not_ok():
            logger.error(f"Error getting rejected. {a_result_rejected.info()}")
            return Result(
                code=a_result_rejected.code(),
                message=a_result_rejected.message(),
            )

        return Result(
            code=ResultCode.OK,
            message="OK",
            result=AdminRequestStatsResponse(
                total=a_result_total.result(),
                pending=a_result_pending.result(),
                accepted=a_result_accepted.result(),
                rejected=a_result_rejected.result(),
            ),
        )
