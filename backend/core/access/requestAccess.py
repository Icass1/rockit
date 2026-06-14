from logging import Logger
from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, load_only

from backend.utils.logger import getLogger
from backend.core.utils.safeAsyncCall import safe_async
from backend.core.aResult import AResult, AResultCode

from backend.core.access.db.ormModels.user import UserRow
from backend.core.access.db.ormModels.userRequest import UserRequestRow
from backend.core.access.db.ormEnums.requestStatusEnum import RequestStatusEnumRow
from backend.core.access.db.ormModels.media import CoreMediaRow

from backend.core.enums.requestStatusEnum import RequestStatusEnum
from backend.core.enums.requestTypeEnum import RequestTypeEnum

logger: Logger = getLogger(__name__)


class RequestAccess:
    @staticmethod
    @safe_async
    async def create_request_async(
        session: AsyncSession,
        user_id: int,
        public_id: str,
        request_type: RequestTypeEnum,
        proposed_value: str,
        media_id: int,
        comment: str | None = None,
    ) -> AResult[UserRequestRow]:
        row = UserRequestRow(
            user_id=user_id,
            public_id=public_id,
            media_id=media_id,
            request_type_key=request_type.value,
            proposed_value=proposed_value,
            comment=comment,
            status_key=1,
        )
        session.add(row)
        await session.commit()
        await session.refresh(row)
        return AResult(code=AResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def get_all_requests_async(
        session: AsyncSession,
        status: RequestStatusEnum | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> AResult[List[UserRequestRow]]:
        query = (
            select(UserRequestRow)
            .options(
                load_only(
                    UserRequestRow.user_id,
                    UserRequestRow.media_id,
                    UserRequestRow.request_type_key,
                    UserRequestRow.proposed_value,
                    UserRequestRow.comment,
                    UserRequestRow.status_key,
                    UserRequestRow.reviewed_by,
                    UserRequestRow.review_comment,
                    UserRequestRow.public_id,
                    UserRequestRow.date_added,
                )
            )
            .order_by(UserRequestRow.id.desc())
        )

        if status is not None:
            query = query.where(UserRequestRow.status_key == status.value)

        result = await session.execute(query.offset(offset).limit(limit))
        rows = list(result.scalars().all())
        return AResult(code=AResultCode.OK, message="OK", result=rows)

    @staticmethod
    @safe_async
    async def get_user_requests_async(
        session: AsyncSession,
        user_id: int,
        limit: int = 50,
        offset: int = 0,
    ) -> AResult[List[UserRequestRow]]:
        query = (
            select(UserRequestRow)
            .where(UserRequestRow.user_id == user_id)
            .order_by(UserRequestRow.id.desc())
        )

        result = await session.execute(query.offset(offset).limit(limit))
        rows = list(result.scalars().all())
        return AResult(code=AResultCode.OK, message="OK", result=rows)

    @staticmethod
    @safe_async
    async def get_request_by_public_id_async(
        session: AsyncSession,
        public_id: str,
    ) -> AResult[UserRequestRow]:
        result = await session.execute(
            select(UserRequestRow).where(UserRequestRow.public_id == public_id)
        )
        row = result.scalars().first()
        if row is None:
            return AResult(AResultCode.NOT_FOUND, "Request not found.", None)
        return AResult(code=AResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def update_request_status_async(
        session: AsyncSession,
        request_id: int,
        status: RequestStatusEnum,
        reviewed_by: int,
        review_comment: str | None = None,
    ) -> AResult[UserRequestRow]:
        result = await session.execute(
            select(UserRequestRow).where(UserRequestRow.id == request_id)
        )
        row = result.scalars().first()
        if row is None:
            return AResult(AResultCode.NOT_FOUND, "Request not found.", None)

        row.status_key = status.value
        row.reviewed_by = reviewed_by
        if review_comment is not None:
            row.review_comment = review_comment
        await session.commit()
        await session.refresh(row)
        return AResult(code=AResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def get_media_id_from_public_id_async(
        session: AsyncSession,
        public_id: str,
    ) -> AResult[int]:
        result = await session.execute(
            select(CoreMediaRow.id).where(CoreMediaRow.public_id == public_id)
        )
        media_id = result.scalar_one_or_none()
        if media_id is None:
            return AResult(
                AResultCode.NOT_FOUND, f"Media '{public_id}' not found.", None
            )
        return AResult(code=AResultCode.OK, message="OK", result=media_id)

    @staticmethod
    @safe_async
    async def get_media_public_id_from_id_async(
        session: AsyncSession,
        media_id: int,
    ) -> AResult[str]:
        result = await session.execute(
            select(CoreMediaRow.public_id).where(CoreMediaRow.id == media_id)
        )
        public_id: str | None = result.scalar_one_or_none()
        if public_id is None:
            return AResult(
                AResultCode.NOT_FOUND, f"Media with id '{media_id}' not found.", None
            )
        return AResult(code=AResultCode.OK, message="OK", result=public_id)

    @staticmethod
    @safe_async
    async def get_user_info_async(
        session: AsyncSession,
        user_id: int,
    ) -> AResult[UserRow]:
        result = await session.execute(
            select(UserRow)
            .options(joinedload(UserRow.image))
            .where(UserRow.id == user_id)
        )
        user = result.unique().scalars().first()
        if user is None:
            return AResult(AResultCode.NOT_FOUND, "User not found.", None)
        return AResult(code=AResultCode.OK, message="OK", result=user)

    @staticmethod
    @safe_async
    async def get_total_count_async(
        session: AsyncSession,
    ) -> AResult[int]:
        result = await session.execute(select(UserRequestRow.id))
        count = len(result.all())
        return AResult(code=AResultCode.OK, message="OK", result=count)

    @staticmethod
    @safe_async
    async def get_count_by_status_async(
        session: AsyncSession,
        status_value: str,
    ) -> AResult[int]:
        result = await session.execute(
            select(UserRequestRow.id)
            .join(
                RequestStatusEnumRow,
                UserRequestRow.status_key == RequestStatusEnumRow.key,
            )
            .where(RequestStatusEnumRow.value == status_value)
        )
        count = len(result.all())
        return AResult(code=AResultCode.OK, message="OK", result=count)
