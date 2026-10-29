from logging import Logger

from sqlalchemy import Result as DBResult
from sqlalchemy import Select, delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.pendingUpload import PendingUploadRow
from core.enums.mediaTypeEnum import MediaTypeEnum
from core.utils.safeAsyncCall import safe_async
from logger import getLogger
from result import Result, ResultCode

logger: Logger = getLogger(__name__)


class PendingUploadAccess:
    @staticmethod
    @safe_async
    async def get_by_public_id_async(
        session: AsyncSession, public_id: str
    ) -> Result[PendingUploadRow]:
        stmt: Select[tuple[PendingUploadRow]] = select(PendingUploadRow).where(
            PendingUploadRow.public_id == public_id
        )
        result: DBResult[tuple[PendingUploadRow]] = await session.execute(statement=stmt)
        row: PendingUploadRow | None = result.scalar_one_or_none()
        if not row:
            logger.error("TODO")
            return Result(
                code=ResultCode.NOT_FOUND,
                message="Pending upload not found.",
            )
        return Result(code=ResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def create_async(
        session: AsyncSession,
        public_id: str,
        user_id: int,
        media_type: str,
        metadata_json: str,
    ) -> Result[PendingUploadRow]:
        row = PendingUploadRow(
            public_id=public_id,
            user_id=user_id,
            media_type_key=MediaTypeEnum[media_type].value,
            metadata_json=metadata_json,
        )
        session.add(instance=row)
        await session.commit()
        await session.refresh(instance=row)
        return Result(code=ResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def set_cover_uploaded_async(
        session: AsyncSession, public_id: str
    ) -> Result[PendingUploadRow]:
        stmt: Select[tuple[PendingUploadRow]] = select(PendingUploadRow).where(
            PendingUploadRow.public_id == public_id
        )
        result: DBResult[tuple[PendingUploadRow]] = await session.execute(statement=stmt)
        row: PendingUploadRow | None = result.scalar_one_or_none()
        if not row:
            logger.error("TODO")
            return Result(
                code=ResultCode.NOT_FOUND,
                message="Pending upload not found.",
            )
        row.cover_uploaded = True
        await session.commit()
        await session.refresh(instance=row)
        return Result(code=ResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def increment_uploaded_song_count_async(
        session: AsyncSession, public_id: str
    ) -> Result[PendingUploadRow]:
        stmt: Select[tuple[PendingUploadRow]] = select(PendingUploadRow).where(
            PendingUploadRow.public_id == public_id
        )
        result: DBResult[tuple[PendingUploadRow]] = await session.execute(statement=stmt)
        row: PendingUploadRow | None = result.scalar_one_or_none()
        if not row:
            logger.error("TODO")
            return Result(
                code=ResultCode.NOT_FOUND,
                message="Pending upload not found.",
            )
        row.uploaded_song_count += 1
        await session.commit()
        await session.refresh(instance=row)
        return Result(code=ResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def delete_by_public_id_async(session: AsyncSession, public_id: str) -> Result[bool]:
        stmt = delete(PendingUploadRow).where(PendingUploadRow.public_id == public_id)
        await session.execute(statement=stmt)
        await session.commit()
        return Result(code=ResultCode.OK, message="OK", result=True)
