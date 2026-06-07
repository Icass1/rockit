from logging import Logger
from typing import Tuple

from sqlalchemy import Result, Select, delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.core.utils.safeAsyncCall import safe_async

from backend.core.aResult import AResult, AResultCode
from backend.core.enums.mediaTypeEnum import MediaTypeEnum

from backend.core.access.db.ormModels.pendingUpload import PendingUploadRow

logger: Logger = getLogger(__name__)


class PendingUploadAccess:
    @staticmethod
    @safe_async
    async def get_by_public_id_async(
        session: AsyncSession, public_id: str
    ) -> AResult[PendingUploadRow]:
        stmt: Select[Tuple[PendingUploadRow]] = select(PendingUploadRow).where(
            PendingUploadRow.public_id == public_id
        )
        result: Result[Tuple[PendingUploadRow]] = await session.execute(statement=stmt)
        row: PendingUploadRow | None = result.scalar_one_or_none()
        if not row:
            logger.error("TODO")
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="Pending upload not found.",
            )
        return AResult(code=AResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def create_async(
        session: AsyncSession,
        public_id: str,
        user_id: int,
        media_type: str,
        metadata_json: str,
    ) -> AResult[PendingUploadRow]:
        row = PendingUploadRow(
            public_id=public_id,
            user_id=user_id,
            media_type_key=MediaTypeEnum[media_type].value,
            metadata_json=metadata_json,
        )
        session.add(instance=row)
        await session.commit()
        await session.refresh(instance=row)
        return AResult(code=AResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def set_cover_uploaded_async(
        session: AsyncSession, public_id: str
    ) -> AResult[PendingUploadRow]:
        stmt: Select[Tuple[PendingUploadRow]] = select(PendingUploadRow).where(
            PendingUploadRow.public_id == public_id
        )
        result: Result[Tuple[PendingUploadRow]] = await session.execute(statement=stmt)
        row: PendingUploadRow | None = result.scalar_one_or_none()
        if not row:
            logger.error("TODO")
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="Pending upload not found.",
            )
        row.cover_uploaded = True
        await session.commit()
        await session.refresh(instance=row)
        return AResult(code=AResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def increment_uploaded_song_count_async(
        session: AsyncSession, public_id: str
    ) -> AResult[PendingUploadRow]:
        stmt: Select[Tuple[PendingUploadRow]] = select(PendingUploadRow).where(
            PendingUploadRow.public_id == public_id
        )
        result: Result[Tuple[PendingUploadRow]] = await session.execute(statement=stmt)
        row: PendingUploadRow | None = result.scalar_one_or_none()
        if not row:
            logger.error("TODO")
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="Pending upload not found.",
            )
        row.uploaded_song_count += 1
        await session.commit()
        await session.refresh(instance=row)
        return AResult(code=AResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def delete_by_public_id_async(
        session: AsyncSession, public_id: str
    ) -> AResult[bool]:
        stmt = delete(PendingUploadRow).where(PendingUploadRow.public_id == public_id)
        await session.execute(statement=stmt)
        await session.commit()
        return AResult(code=AResultCode.OK, message="OK", result=True)
