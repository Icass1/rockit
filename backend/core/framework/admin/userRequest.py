from logging import Logger

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.enums.requestTypeEnum import RequestTypeEnum
from backend.core.enums.requestStatusEnum import RequestStatusEnum

from backend.core.access.db.ormModels.userRequest import UserRequestRow

from backend.core.access.requestAccess import RequestAccess

from backend.core.responses.userRequestResponse import (
    UserRequestResponse,
    UserRequestListResponse,
    AdminRequestStatsResponse,
)

logger: Logger = getLogger(__name__)


async def _map_request_to_response(
    session: AsyncSession, row: UserRequestRow
) -> AResult[UserRequestResponse]:

    a_result_public_id = await RequestAccess.get_media_public_id_from_id_async(
        session=session, media_id=row.media_id
    )
    media_public_id: str = ""
    if a_result_public_id.is_ok():
        media_public_id = a_result_public_id.result()

    user_name: str | None = None
    user_image: str | None = None
    a_result_user = await RequestAccess.get_user_info_async(
        session=session, user_id=row.user_id
    )
    if a_result_user.is_ok():
        user = a_result_user.result()
        user_name = user.username
        user_image = user.image.public_id

    return AResult(
        code=AResultCode.OK,
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
    ) -> AResult[UserRequestResponse]:
        a_result_media = await RequestAccess.get_media_id_from_public_id_async(
            session=session, public_id=media_public_id
        )
        if a_result_media.is_not_ok():
            logger.error(f"Media not found. {a_result_media.info()}")
            return AResult(
                code=a_result_media.code(),
                message=a_result_media.message(),
            )
        media_id = a_result_media.result()

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
            return AResult(code=a_result.code(), message=a_result.message())

        return await _map_request_to_response(session=session, row=a_result.result())

    @staticmethod
    async def get_all_requests_async(
        session: AsyncSession,
        status: RequestStatusEnum | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> AResult[UserRequestListResponse]:
        a_result = await RequestAccess.get_all_requests_async(
            session=session, status=status, limit=limit, offset=offset
        )
        if a_result.is_not_ok():
            logger.error(f"Error getting requests. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        responses: list[UserRequestResponse] = []
        for row in a_result.result():
            a_result_resp = await _map_request_to_response(session=session, row=row)
            if a_result_resp.is_ok():
                responses.append(a_result_resp.result())

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=UserRequestListResponse(requests=responses),
        )

    @staticmethod
    async def get_user_requests_async(
        session: AsyncSession,
        user_id: int,
        limit: int = 50,
        offset: int = 0,
    ) -> AResult[UserRequestListResponse]:
        a_result = await RequestAccess.get_user_requests_async(
            session=session, user_id=user_id, limit=limit, offset=offset
        )
        if a_result.is_not_ok():
            logger.error(f"Error getting user requests. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        responses: list[UserRequestResponse] = []
        for row in a_result.result():
            a_result_resp = await _map_request_to_response(session=session, row=row)
            if a_result_resp.is_ok():
                responses.append(a_result_resp.result())

        return AResult(
            code=AResultCode.OK,
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
    ) -> AResult[UserRequestResponse]:
        a_result_request = await RequestAccess.get_request_by_public_id_async(
            session=session, public_id=public_id
        )
        if a_result_request.is_not_ok():
            logger.error(f"Request not found. {a_result_request.info()}")
            return AResult(
                code=a_result_request.code(), message=a_result_request.message()
            )

        request_row = a_result_request.result()
        a_result = await RequestAccess.update_request_status_async(
            session=session,
            request_id=request_row.id,
            status=status,
            reviewed_by=reviewer_id,
            review_comment=review_comment,
        )
        if a_result.is_not_ok():
            logger.error(f"Error updating request. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return await _map_request_to_response(session=session, row=a_result.result())

    @staticmethod
    async def get_stats_async(
        session: AsyncSession,
    ) -> AResult[AdminRequestStatsResponse]:
        a_result_total = await RequestAccess.get_total_count_async(session=session)
        if a_result_total.is_not_ok():
            logger.error(f"Error getting total. {a_result_total.info()}")
            return AResult(
                code=a_result_total.code(),
                message=a_result_total.message(),
            )

        a_result_pending = await RequestAccess.get_count_by_status_async(
            session=session, status_value="pending"
        )
        if a_result_pending.is_not_ok():
            logger.error(f"Error getting pending. {a_result_pending.info()}")
            return AResult(
                code=a_result_pending.code(),
                message=a_result_pending.message(),
            )

        a_result_accepted = await RequestAccess.get_count_by_status_async(
            session=session, status_value="accepted"
        )
        if a_result_accepted.is_not_ok():
            logger.error(f"Error getting accepted. {a_result_accepted.info()}")
            return AResult(
                code=a_result_accepted.code(),
                message=a_result_accepted.message(),
            )

        a_result_rejected = await RequestAccess.get_count_by_status_async(
            session=session, status_value="rejected"
        )
        if a_result_rejected.is_not_ok():
            logger.error(f"Error getting rejected. {a_result_rejected.info()}")
            return AResult(
                code=a_result_rejected.code(),
                message=a_result_rejected.message(),
            )

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=AdminRequestStatsResponse(
                total=a_result_total.result(),
                pending=a_result_pending.result(),
                accepted=a_result_accepted.result(),
                rejected=a_result_rejected.result(),
            ),
        )
